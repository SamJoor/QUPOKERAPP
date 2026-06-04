create table if not exists public.poker_match_actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.poker_matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('check', 'call', 'bet', 'raise', 'fold', 'deal', 'join', 'leave', 'system')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists poker_match_actions_match_created_idx on public.poker_match_actions(match_id, created_at);
alter table public.poker_match_actions enable row level security;

drop policy if exists "poker actions participant read" on public.poker_match_actions;
create policy "poker actions participant read" on public.poker_match_actions for select using (
  public.is_admin(auth.uid()) or public.is_poker_match_participant(match_id, auth.uid())
);

drop policy if exists "poker actions participant insert" on public.poker_match_actions;
create policy "poker actions participant insert" on public.poker_match_actions for insert with check (
  user_id = auth.uid()
  and public.is_poker_match_participant(match_id, auth.uid())
);

create or replace function public.update_poker_match_state(
  p_match_id uuid,
  p_action_type text,
  p_payload jsonb,
  p_game_state jsonb,
  p_next_turn_user_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_poker_match_participant(p_match_id, auth.uid()) then raise exception 'Match access required'; end if;
  if p_action_type not in ('check', 'call', 'bet', 'raise', 'fold', 'deal', 'join', 'leave', 'system') then
    raise exception 'Invalid match action';
  end if;

  insert into public.poker_match_actions(match_id, user_id, action_type, payload)
  values (p_match_id, auth.uid(), p_action_type, coalesce(p_payload, '{}'::jsonb));

  update public.poker_matches
  set
    game_state = coalesce(p_game_state, game_state),
    current_turn_user_id = p_next_turn_user_id,
    status = case when status = 'waiting' then 'in_progress' else status end,
    updated_at = now()
  where id = p_match_id;

  return (select game_state from public.poker_matches where id = p_match_id);
end;
$$;

create or replace function public.get_poker_match_history(p_match_id uuid)
returns table(id uuid, user_id uuid, full_name text, action_type text, payload jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.user_id, p.full_name, a.action_type, a.payload, a.created_at
  from public.poker_match_actions a
  join public.profiles p on p.id = a.user_id
  where a.match_id = p_match_id
    and (public.is_admin(auth.uid()) or public.is_poker_match_participant(p_match_id, auth.uid()))
  order by a.created_at asc;
$$;
