-- 026_poker_room_codes.sql
--
-- Custom games joined by a short code that people can read aloud or type, instead of the
-- 24-character base64 token 006 generates for invite links.
--
-- Everything downstream is reused: the code lives in poker_matches.invite_token, which is
-- already unique, so join_poker_room delegates to accept_poker_invite and the existing seat
-- assignment, realtime subscription and deal_poker_match flow all work untouched.
--
-- Matches are still heads-up. poker_match_players constrains seat to (1, 2), so a room holds
-- the creator and one friend. Larger tables need that constraint widened first.

-- No 0/O/1/I/5/S - they are the pairs people mistype when reading a code to someone.
create or replace function public.generate_room_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
  code text;
  attempt int := 0;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.poker_matches where invite_token = code);

    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'Could not allocate a room code, please try again';
    end if;
  end loop;

  return code;
end;
$$;

create or replace function public.create_poker_room()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_id uuid;
  code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  -- One open room per person, otherwise a player who taps twice leaves an orphan their
  -- friends might join by an old code.
  update public.poker_matches
  set status = 'cancelled', updated_at = now()
  where created_by = auth.uid() and status = 'waiting' and match_type = 'friend';

  code := public.generate_room_code();

  insert into public.poker_matches(match_type, status, created_by, invite_token, game_state)
  values ('friend', 'waiting', auth.uid(), code,
          jsonb_build_object('practice_only', true, 'cash_value', false, 'room_code', true))
  returning id into match_id;

  insert into public.poker_match_players(match_id, user_id, seat, display_name)
  select match_id, p.id, 1, p.full_name from public.profiles p where p.id = auth.uid();

  return jsonb_build_object('status', 'waiting', 'match_id', match_id, 'room_code', code);
end;
$$;

-- Codes are shown uppercase and stored uppercase, so accept whatever casing was typed.
create or replace function public.join_poker_room(p_room_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  normalised text := upper(regexp_replace(coalesce(p_room_code, ''), '\s', '', 'g'));
begin
  if normalised = '' then raise exception 'Enter a room code'; end if;
  return public.accept_poker_invite(normalised);
end;
$$;

-- The room the caller currently has open, so the lobby can show its code again after a
-- backgrounded app or a reinstall.
create or replace function public.get_my_open_room()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('match_id', m.id, 'room_code', m.invite_token)
  from public.poker_matches m
  where m.created_by = auth.uid() and m.status = 'waiting' and m.match_type = 'friend'
  order by m.created_at desc
  limit 1;
$$;

revoke all on function public.generate_room_code() from public, anon, authenticated;
revoke all on function public.create_poker_room() from public, anon;
revoke all on function public.join_poker_room(text) from public, anon;
revoke all on function public.get_my_open_room() from public, anon;
grant execute on function public.create_poker_room() to authenticated;
grant execute on function public.join_poker_room(text) to authenticated;
grant execute on function public.get_my_open_room() to authenticated;
