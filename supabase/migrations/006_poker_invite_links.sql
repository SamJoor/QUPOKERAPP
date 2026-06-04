alter table public.poker_matches add column if not exists invite_token text unique;
create index if not exists poker_matches_invite_token_idx on public.poker_matches(invite_token);

create or replace function public.create_poker_invite()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_id uuid;
  token text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  token := encode(gen_random_bytes(18), 'base64');
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');

  insert into public.poker_matches(match_type, status, created_by, invite_token, game_state)
  values ('friend', 'waiting', auth.uid(), token, jsonb_build_object('practice_only', true, 'cash_value', false, 'invite_link', true))
  returning id into match_id;

  insert into public.poker_match_players(match_id, user_id, seat, display_name)
  select match_id, p.id, 1, p.full_name from public.profiles p where p.id = auth.uid();

  return jsonb_build_object('status', 'waiting', 'match_id', match_id, 'invite_token', token, 'message', 'Invite link created.');
end;
$$;

create or replace function public.accept_poker_invite(p_invite_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_row record;
  player_count int;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into match_row
  from public.poker_matches
  where invite_token = p_invite_token and status = 'waiting'
  for update;

  if match_row.id is null then raise exception 'This invite link is invalid or no longer available'; end if;
  if match_row.created_by = auth.uid() then
    return jsonb_build_object('status', 'creator', 'match_id', match_row.id, 'message', 'This is your invite link.');
  end if;

  select count(*) into player_count from public.poker_match_players where match_id = match_row.id and user_id is not null;
  if player_count >= 2 then raise exception 'This match already has two players'; end if;

  insert into public.poker_match_players(match_id, user_id, seat, display_name)
  select match_row.id, p.id, 2, p.full_name from public.profiles p where p.id = auth.uid()
  on conflict (match_id, user_id) do nothing;

  update public.poker_matches
  set status = 'in_progress', updated_at = now()
  where id = match_row.id;

  return jsonb_build_object('status', 'accepted', 'match_id', match_row.id, 'message', 'Invite accepted. Friendly practice match joined.');
end;
$$;
