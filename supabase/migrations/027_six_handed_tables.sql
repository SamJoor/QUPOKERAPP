-- 027_six_handed_tables.sql
--
-- Opens rooms to six players. 005 constrained poker_match_players.seat to (1, 2) and 016
-- deals exactly two hands, so a third player could not sit down even though the room code
-- flow in 026 would happily send them.
--
-- Trust model is unchanged from 016: the server owns the cards, because those are the secret,
-- and the client computes the betting maths and pushes it through update_poker_match_state.
-- These are play chips with no cash value. Moving the betting engine server-side is the right
-- thing eventually, but it is a separate change and not one to make in the same migration
-- that widens the table.

alter table public.poker_match_players drop constraint if exists poker_match_players_seat_check;
alter table public.poker_match_players add constraint poker_match_players_seat_check
  check (seat between 1 and 6);

-- Which seat holds the dealer button. Blinds sit to its left, and it moves between hands.
alter table public.poker_matches add column if not exists button_seat int;

-- Seat assignment used to be hardcoded to 2 for whoever accepted. With six seats it has to
-- find the lowest free one, and the cap moves from two players to six.
create or replace function public.accept_poker_invite(p_invite_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_row record;
  seated int;
  free_seat int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into match_row
  from public.poker_matches
  where invite_token = p_invite_token and status = 'waiting'
  for update;

  if match_row.id is null then raise exception 'This room code is invalid or no longer available'; end if;

  if exists (select 1 from public.poker_match_players where match_id = match_row.id and user_id = auth.uid()) then
    return jsonb_build_object('status', 'already_seated', 'match_id', match_row.id, 'message', 'You are already at this table.');
  end if;

  select count(*) into seated from public.poker_match_players where match_id = match_row.id;
  if seated >= 6 then raise exception 'This table is full'; end if;

  select min(candidate) into free_seat
  from generate_series(1, 6) as candidate
  where candidate not in (select seat from public.poker_match_players where match_id = match_row.id);

  insert into public.poker_match_players(match_id, user_id, seat, display_name)
  select match_row.id, p.id, free_seat, p.full_name from public.profiles p where p.id = auth.uid();

  -- The room stays open until the host deals, so later friends can still join.
  return jsonb_build_object('status', 'seated', 'match_id', match_row.id, 'seat', free_seat);
end;
$$;

-- Who is currently sitting, for the lobby.
create or replace function public.get_room_seats(p_match_id uuid)
returns table(seat int, user_id uuid, display_name text, avatar_url text, avatar_key text, is_host boolean)
language sql stable security definer set search_path = public as $$
  select mp.seat, mp.user_id, mp.display_name, p.avatar_url, p.avatar_key,
         (m.created_by = mp.user_id) as is_host
  from public.poker_match_players mp
  join public.poker_matches m on m.id = mp.match_id
  left join public.profiles p on p.id = mp.user_id
  where mp.match_id = p_match_id
    and public.is_poker_match_participant(p_match_id, auth.uid())
  order by mp.seat;
$$;

-- Deals to however many players are seated, rather than exactly two. Two cards each off the
-- top, then five community cards - the same order a live deal would use, so a player counting
-- cards sees nothing unusual.
create or replace function public.deal_poker_table(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_row record;
  seated int;
  deck jsonb;
  offset_index int := 0;
  player record;
  button int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into match_row from public.poker_matches where id = p_match_id for update;
  if match_row.id is null then raise exception 'Table not found'; end if;
  if match_row.created_by <> auth.uid() then raise exception 'Only the host can deal'; end if;
  if exists (select 1 from public.poker_match_community_hidden where match_id = p_match_id) then
    raise exception 'Hand already dealt';
  end if;

  select count(*) into seated from public.poker_match_players where match_id = p_match_id and user_id is not null;
  if seated < 2 then raise exception 'At least two players must be seated before dealing'; end if;

  select jsonb_agg(jsonb_build_object('rank', rank, 'suit', suit) order by ord)
  into deck
  from (
    select rank, suit, row_number() over (order by random()) as ord
    from unnest(array['2','3','4','5','6','7','8','9','10','J','Q','K','A']) as rank
    cross join unnest(array['S','H','D','C']) as suit
  ) shuffled;

  for player in
    select user_id, seat from public.poker_match_players
    where match_id = p_match_id and user_id is not null
    order by seat
  loop
    insert into public.poker_match_hole_cards(match_id, user_id, cards)
    values (p_match_id, player.user_id,
            jsonb_build_array(deck -> offset_index, deck -> (offset_index + 1)));
    offset_index := offset_index + 2;
  end loop;

  insert into public.poker_match_community_hidden(match_id, cards)
  values (p_match_id, jsonb_build_array(
    deck -> offset_index, deck -> (offset_index + 1), deck -> (offset_index + 2),
    deck -> (offset_index + 3), deck -> (offset_index + 4)
  ));

  -- Button moves one seat per hand so the blinds rotate.
  select coalesce(
    (select min(seat) from public.poker_match_players
      where match_id = p_match_id and user_id is not null and seat > coalesce(match_row.button_seat, 0)),
    (select min(seat) from public.poker_match_players where match_id = p_match_id and user_id is not null)
  ) into button;

  update public.poker_matches
  set status = 'in_progress', button_seat = button, updated_at = now()
  where id = p_match_id;

  -- game_state is initialised by the host client from createTableState(), which owns the
  -- blind and turn-order rules. Returning the seat list keeps those two in step.
  return jsonb_build_object(
    'dealt', true,
    'button_seat', button,
    'seats', (select jsonb_agg(seat order by seat) from public.poker_match_players
              where match_id = p_match_id and user_id is not null)
  );
end;
$$;

-- The showdown reveal needs seats, not just user ids - the engine awards pots by seat.
-- Adding a column changes the return type, which create or replace cannot do, so this has to
-- be dropped first. 016 left it on the default PUBLIC execute grant; it is restricted to
-- authenticated below to match the newer functions.
drop function if exists public.get_showdown_hole_cards(uuid);

create function public.get_showdown_hole_cards(p_match_id uuid)
returns table(user_id uuid, seat int, cards jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_poker_match_participant(p_match_id, auth.uid()) then raise exception 'Match access required'; end if;
  if (select (game_state ->> 'street') from public.poker_matches where id = p_match_id) <> 'showdown' then
    raise exception 'Hand is not at showdown yet';
  end if;
  return query
    select h.user_id, mp.seat, h.cards
    from public.poker_match_hole_cards h
    join public.poker_match_players mp
      on mp.match_id = h.match_id and mp.user_id = h.user_id
    where h.match_id = p_match_id
    order by mp.seat;
end;
$$;

revoke all on function public.get_showdown_hole_cards(uuid) from public, anon;
grant execute on function public.get_showdown_hole_cards(uuid) to authenticated;

revoke all on function public.get_room_seats(uuid) from public, anon;
revoke all on function public.deal_poker_table(uuid) from public, anon;
grant execute on function public.get_room_seats(uuid) to authenticated;
grant execute on function public.deal_poker_table(uuid) to authenticated;
