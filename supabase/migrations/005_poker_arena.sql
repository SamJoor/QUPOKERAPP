create table public.poker_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table public.poker_match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preferred_level text not null default 'Club Regular',
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index poker_match_queue_one_waiting_idx on public.poker_match_queue(user_id) where status = 'waiting';
create index poker_match_queue_status_created_idx on public.poker_match_queue(status, created_at);

create table public.poker_matches (
  id uuid primary key default gen_random_uuid(),
  match_type text not null check (match_type in ('bot', 'friend', 'queue')),
  status text not null default 'waiting' check (status in ('waiting', 'in_progress', 'completed', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  current_turn_user_id uuid references public.profiles(id) on delete set null,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.poker_match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.poker_matches(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  bot_level text,
  seat int not null check (seat in (1, 2)),
  display_name text not null,
  practice_chips int not null default 1000 check (practice_chips >= 0),
  status text not null default 'active' check (status in ('active', 'folded', 'out')),
  created_at timestamptz not null default now(),
  check (user_id is not null or bot_level is not null),
  unique (match_id, seat),
  unique (match_id, user_id)
);

create index poker_matches_status_updated_idx on public.poker_matches(status, updated_at desc);
create index poker_match_players_user_idx on public.poker_match_players(user_id);
create index poker_friendships_requester_idx on public.poker_friendships(requester_id);
create index poker_friendships_addressee_idx on public.poker_friendships(addressee_id);

create trigger poker_friendships_touch before update on public.poker_friendships for each row execute function public.touch_updated_at();
create trigger poker_match_queue_touch before update on public.poker_match_queue for each row execute function public.touch_updated_at();
create trigger poker_matches_touch before update on public.poker_matches for each row execute function public.touch_updated_at();

create or replace function public.update_own_profile(
  p_full_name text,
  p_student_id text default null,
  p_graduation_year int default null,
  p_major text default null,
  p_avatar_url text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_full_name), '') is null then raise exception 'Full name is required'; end if;
  if nullif(trim(coalesce(p_student_id, '')), '') is null then raise exception 'QU Student ID is required'; end if;

  update public.profiles
  set
    full_name = trim(p_full_name),
    student_id = trim(p_student_id),
    graduation_year = p_graduation_year,
    major = nullif(trim(coalesce(p_major, '')), ''),
    avatar_url = p_avatar_url
  where id = auth.uid();
end;
$$;

create or replace function public.join_poker_queue(p_preferred_level text default 'Club Regular')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  opponent record;
  match_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into opponent
  from public.poker_match_queue
  where status = 'waiting' and user_id <> auth.uid()
  order by created_at asc
  limit 1
  for update skip locked;

  insert into public.poker_match_queue(user_id, preferred_level, status)
  values (auth.uid(), coalesce(nullif(trim(p_preferred_level), ''), 'Club Regular'), 'waiting')
  on conflict (user_id) where status = 'waiting'
  do update set preferred_level = excluded.preferred_level, updated_at = now();

  if opponent.id is not null then
    insert into public.poker_matches(match_type, status, created_by, game_state)
    values ('queue', 'waiting', auth.uid(), jsonb_build_object('practice_only', true, 'cash_value', false))
    returning id into match_id;

    insert into public.poker_match_players(match_id, user_id, seat, display_name)
    select match_id, p.id, 1, p.full_name from public.profiles p where p.id = opponent.user_id;

    insert into public.poker_match_players(match_id, user_id, seat, display_name)
    select match_id, p.id, 2, p.full_name from public.profiles p where p.id = auth.uid();

    update public.poker_match_queue
    set status = 'matched', updated_at = now()
    where id = opponent.id or user_id = auth.uid();

    return jsonb_build_object('status', 'matched', 'match_id', match_id, 'message', 'Friendly practice match found.');
  end if;

  return jsonb_build_object('status', 'waiting', 'message', 'You are in the friendly practice queue.');
end;
$$;

create or replace function public.leave_poker_queue()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.poker_match_queue
  set status = 'cancelled', updated_at = now()
  where user_id = auth.uid() and status = 'waiting';
end;
$$;

create or replace function public.create_friend_poker_match(p_friend_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  match_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_friend_id = auth.uid() then raise exception 'Choose a different member'; end if;
  if not exists(select 1 from public.profiles where id = p_friend_id) then raise exception 'Member not found'; end if;

  insert into public.poker_matches(match_type, status, created_by, game_state)
  values ('friend', 'waiting', auth.uid(), jsonb_build_object('practice_only', true, 'cash_value', false))
  returning id into match_id;

  insert into public.poker_match_players(match_id, user_id, seat, display_name)
  select match_id, p.id, 1, p.full_name from public.profiles p where p.id = auth.uid();

  insert into public.poker_match_players(match_id, user_id, seat, display_name)
  select match_id, p.id, 2, p.full_name from public.profiles p where p.id = p_friend_id;

  return jsonb_build_object('status', 'waiting', 'match_id', match_id, 'message', 'Friendly practice invite created.');
end;
$$;

alter table public.poker_friendships enable row level security;
alter table public.poker_match_queue enable row level security;
alter table public.poker_matches enable row level security;
alter table public.poker_match_players enable row level security;

create or replace function public.is_poker_match_participant(p_match_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.poker_match_players
    where match_id = p_match_id and user_id = p_user_id
  );
$$;

create policy "friendships participants read" on public.poker_friendships for select using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin(auth.uid()));
create policy "friendships requester create" on public.poker_friendships for insert with check (requester_id = auth.uid());
create policy "friendships participants update" on public.poker_friendships for update using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin(auth.uid())) with check (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin(auth.uid()));

create policy "queue own read" on public.poker_match_queue for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "queue own insert" on public.poker_match_queue for insert with check (user_id = auth.uid());
create policy "queue own update" on public.poker_match_queue for update using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "matches participant read" on public.poker_matches for select using (
  public.is_admin(auth.uid()) or public.is_poker_match_participant(id, auth.uid())
);

create policy "match players participant read" on public.poker_match_players for select using (
  public.is_admin(auth.uid()) or public.is_poker_match_participant(match_id, auth.uid())
);
