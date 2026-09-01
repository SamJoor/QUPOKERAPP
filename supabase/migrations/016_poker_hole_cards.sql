-- Hidden information for live 2-player poker matches: hole cards and not-yet-revealed
-- community cards must never be selectable by the opposing participant. `poker_matches.game_state`
-- is readable in full by both seats (see 005/015 RLS), so hidden data cannot live there.
--
-- poker_match_hole_cards: each row is only visible to the user it belongs to.
-- poker_match_community_hidden: no client-facing select policy at all — only security-definer
-- RPCs (owned by the migration role, which bypasses RLS) can read/write it. Community cards are
-- published into the public `game_state.community` array street-by-street via reveal_community_street.
--
-- Accepted limitation: bet legality / showdown comparison remain entirely client-computed and
-- unvalidated server-side, same trust model `update_poker_match_state` already uses. Acceptable
-- because this app is explicitly practice-chips-only with no real-money stakes.

create table if not exists public.poker_match_hole_cards (
  match_id uuid not null references public.poker_matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cards jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.poker_match_hole_cards enable row level security;

drop policy if exists "own hole cards only" on public.poker_match_hole_cards;
create policy "own hole cards only" on public.poker_match_hole_cards
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.poker_match_community_hidden (
  match_id uuid primary key references public.poker_matches(id) on delete cascade,
  cards jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.poker_match_community_hidden enable row level security;
-- Deliberately no select/insert/update policy: this table is unreachable via PostgREST/client
-- queries entirely. Only security-definer functions below (owned by a privileged migration role)
-- can touch it.

create or replace function public.deal_poker_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  seat1_user uuid;
  seat2_user uuid;
  deck jsonb;
  seat1_cards jsonb;
  seat2_cards jsonb;
  community jsonb;
  opening_bet int := 20;
  starting_stack int := 1000;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_poker_match_participant(p_match_id, auth.uid()) then raise exception 'Match access required'; end if;
  if exists (select 1 from public.poker_match_community_hidden where match_id = p_match_id) then
    raise exception 'Hand already dealt';
  end if;

  select user_id into seat1_user from public.poker_match_players where match_id = p_match_id and seat = 1;
  select user_id into seat2_user from public.poker_match_players where match_id = p_match_id and seat = 2;
  if seat1_user is null or seat2_user is null then raise exception 'Both seats must be filled before dealing'; end if;

  select jsonb_agg(jsonb_build_object('rank', rank, 'suit', suit) order by ord)
  into deck
  from (
    select rank, suit, row_number() over (order by random()) as ord
    from unnest(array['2','3','4','5','6','7','8','9','10','J','Q','K','A']) as rank
    cross join unnest(array['S','H','D','C']) as suit
  ) shuffled;

  seat1_cards := jsonb_build_array(deck -> 0, deck -> 1);
  seat2_cards := jsonb_build_array(deck -> 2, deck -> 3);
  community := jsonb_build_array(deck -> 4, deck -> 5, deck -> 6, deck -> 7, deck -> 8);

  insert into public.poker_match_hole_cards(match_id, user_id, cards) values
    (p_match_id, seat1_user, seat1_cards),
    (p_match_id, seat2_user, seat2_cards);

  insert into public.poker_match_community_hidden(match_id, cards) values (p_match_id, community);

  update public.poker_matches
  set
    status = 'in_progress',
    current_turn_user_id = seat1_user,
    game_state = jsonb_build_object(
      'street', 'preflop',
      'pot', opening_bet * 2,
      'currentBet', opening_bet,
      'community', '[]'::jsonb,
      'seat1', jsonb_build_object('committed', opening_bet, 'stack', starting_stack - opening_bet, 'status', 'active'),
      'seat2', jsonb_build_object('committed', opening_bet, 'stack', starting_stack - opening_bet, 'status', 'active'),
      'currentTurnSeat', 1,
      'actionsThisRound', 0,
      'handOver', false,
      'result', null,
      'message', 'Hand dealt. Blinds posted.'
    ),
    updated_at = now()
  where id = p_match_id;

  return jsonb_build_object('dealt', true);
end;
$$;

create or replace function public.get_my_hole_cards(p_match_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select cards from public.poker_match_hole_cards where match_id = p_match_id and user_id = auth.uid();
$$;

create or replace function public.get_showdown_hole_cards(p_match_id uuid)
returns table(user_id uuid, cards jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_poker_match_participant(p_match_id, auth.uid()) then raise exception 'Match access required'; end if;
  if (select (game_state ->> 'street') from public.poker_matches where id = p_match_id) <> 'showdown' then
    raise exception 'Hand is not at showdown yet';
  end if;
  return query select h.user_id, h.cards from public.poker_match_hole_cards h where h.match_id = p_match_id;
end;
$$;

create or replace function public.reveal_community_street(p_match_id uuid, p_street text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  hidden jsonb;
  reveal_count int;
begin
  if not public.is_poker_match_participant(p_match_id, auth.uid()) then raise exception 'Match access required'; end if;
  if p_street not in ('flop', 'turn', 'river', 'showdown') then raise exception 'Invalid street'; end if;

  select cards into hidden from public.poker_match_community_hidden where match_id = p_match_id;
  if hidden is null then raise exception 'Hand has not been dealt yet'; end if;

  reveal_count := case p_street when 'flop' then 3 when 'turn' then 4 else 5 end;

  update public.poker_matches
  set
    game_state = game_state || jsonb_build_object('community', (select jsonb_agg(c) from jsonb_array_elements(hidden) with ordinality as t(c, i) where i <= reveal_count), 'street', p_street),
    updated_at = now()
  where id = p_match_id;

  return (select game_state from public.poker_matches where id = p_match_id);
end;
$$;

-- Declining/cancelling a friend request removes the row entirely (no "declined" status exists
-- in the poker_friendships check constraint, and reusing "blocked" would misrepresent a simple
-- decline) — migration 005 never added a delete policy for poker_friendships, so add one now.
drop policy if exists "friendships participants delete" on public.poker_friendships;
create policy "friendships participants delete" on public.poker_friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin(auth.uid()));

create or replace function public.search_club_members(p_query text)
returns table(id uuid, full_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and nullif(trim(p_query), '') is not null
    and p.full_name ilike '%' || trim(p_query) || '%'
  order by p.full_name
  limit 20;
$$;
