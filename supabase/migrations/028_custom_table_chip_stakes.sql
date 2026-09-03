-- 028_custom_table_chip_stakes.sql
--
-- Custom tables now play for real chips. Offline tables deliberately do not - they never
-- touch profiles.chips, so practising cannot cost anyone their balance.
--
-- Chips move twice per hand:
--   deal_poker_table debits each player's buy-in and records it on their seat row
--   settle_poker_table credits their final stack back
--
-- Debiting up front matters: if someone closes the app mid-hand their chips are already
-- committed, so they cannot be spent at a second table at the same time.
--
-- Settlement is server-side and conserves chips. The client computes the betting maths and
-- publishes game_state, so a tampered client could claim to have won. The server cannot
-- re-run the hand, but it can refuse a result that invents chips: the sum of final stacks
-- must equal the sum of buy-ins. That blocks the obvious forgery - everybody wins - and
-- bounds any subtler one to moving chips between players who chose to sit down together.

alter table public.poker_match_players
  add column if not exists buy_in int not null default 0 check (buy_in >= 0);

alter table public.poker_matches
  add column if not exists settled_at timestamptz;

-- A table is worth sitting at only if you can cover the blinds a few times over.
create or replace function public.table_buy_in(p_chips int)
returns int language sql immutable as $$
  select least(greatest(coalesce(p_chips, 0), 0), 1000);
$$;

-- Replaces the 027 version. Same dealing, plus the buy-in debit.
create or replace function public.deal_poker_table(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_row record;
  seated int;
  deck jsonb;
  offset_index int := 0;
  player record;
  button int;
  stake int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into match_row from public.poker_matches where id = p_match_id for update;
  if match_row.id is null then raise exception 'Table not found'; end if;
  if match_row.created_by <> auth.uid() then raise exception 'Only the host can deal'; end if;
  if exists (select 1 from public.poker_match_community_hidden where match_id = p_match_id) then
    raise exception 'Hand already dealt';
  end if;

  select count(*) into seated from public.poker_match_players
  where match_id = p_match_id and user_id is not null;
  if seated < 2 then raise exception 'At least two players must be seated before dealing'; end if;

  -- Nobody sits without enough chips to post a big blind and have something behind.
  if exists (
    select 1 from public.poker_match_players mp
    join public.profiles p on p.id = mp.user_id
    where mp.match_id = p_match_id and mp.user_id is not null and p.chips < 100
  ) then
    raise exception 'Everyone needs at least 100 chips to sit down';
  end if;

  select jsonb_agg(jsonb_build_object('rank', rank, 'suit', suit) order by ord)
  into deck
  from (
    select rank, suit, row_number() over (order by random()) as ord
    from unnest(array['2','3','4','5','6','7','8','9','10','J','Q','K','A']) as rank
    cross join unnest(array['S','H','D','C']) as suit
  ) shuffled;

  for player in
    select mp.user_id, mp.seat, p.chips
    from public.poker_match_players mp
    join public.profiles p on p.id = mp.user_id
    where mp.match_id = p_match_id and mp.user_id is not null
    order by mp.seat
  loop
    stake := public.table_buy_in(player.chips);

    update public.profiles set chips = chips - stake, updated_at = now()
    where id = player.user_id;

    update public.poker_match_players set buy_in = stake
    where match_id = p_match_id and user_id = player.user_id;

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

  select coalesce(
    (select min(seat) from public.poker_match_players
      where match_id = p_match_id and user_id is not null and seat > coalesce(match_row.button_seat, 0)),
    (select min(seat) from public.poker_match_players where match_id = p_match_id and user_id is not null)
  ) into button;

  update public.poker_matches
  set status = 'in_progress', button_seat = button, settled_at = null, updated_at = now()
  where id = p_match_id;

  -- Buy-ins go back so the client can seat each player with their own stack.
  return jsonb_build_object(
    'dealt', true,
    'button_seat', button,
    'seats', (select jsonb_agg(seat order by seat) from public.poker_match_players
              where match_id = p_match_id and user_id is not null),
    'buy_ins', (select jsonb_object_agg(seat::text, buy_in) from public.poker_match_players
                where match_id = p_match_id and user_id is not null)
  );
end;
$$;

/**
 * Returns each player's final stack to their chip balance.
 *
 * Refuses unless the published hand is over, refuses a second time, and refuses any result
 * where the stacks do not add up to the buy-ins. Safe for every player to call - whoever gets
 * there first settles and the rest are told it is already done - because a client that crashes
 * before settling would otherwise strand everyone's chips.
 */
create or replace function public.settle_poker_table(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_row record;
  seat_entry jsonb;
  staked int;
  returned int;
  settled_count int := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_poker_match_participant(p_match_id, auth.uid()) then
    raise exception 'Match access required';
  end if;

  select * into match_row from public.poker_matches where id = p_match_id for update;
  if match_row.id is null then raise exception 'Table not found'; end if;
  if match_row.settled_at is not null then
    return jsonb_build_object('status', 'already_settled');
  end if;
  if coalesce((match_row.game_state ->> 'handOver')::boolean, false) is not true then
    raise exception 'Hand is not finished';
  end if;

  select coalesce(sum(buy_in), 0) into staked
  from public.poker_match_players where match_id = p_match_id and user_id is not null;

  select coalesce(sum((entry ->> 'stack')::int), 0) into returned
  from jsonb_array_elements(match_row.game_state -> 'seats') as entry;

  -- The one thing the server can check without re-running the hand.
  if returned <> staked then
    raise exception 'Result does not balance: % chips staked, % returned', staked, returned;
  end if;

  for seat_entry in select * from jsonb_array_elements(match_row.game_state -> 'seats')
  loop
    update public.profiles p
    set chips = p.chips + (seat_entry ->> 'stack')::int, updated_at = now()
    from public.poker_match_players mp
    where mp.match_id = p_match_id
      and mp.seat = (seat_entry ->> 'seat')::int
      and mp.user_id = p.id;
    settled_count := settled_count + 1;
  end loop;

  update public.poker_matches
  set settled_at = now(), status = 'completed', updated_at = now()
  where id = p_match_id;

  return jsonb_build_object('status', 'settled', 'seats', settled_count, 'returned', returned);
end;
$$;

revoke all on function public.settle_poker_table(uuid) from public, anon;
grant execute on function public.settle_poker_table(uuid) to authenticated;
