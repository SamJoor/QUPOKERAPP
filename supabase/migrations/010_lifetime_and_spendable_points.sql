alter table public.profiles add column if not exists lifetime_points int not null default 0 check (lifetime_points >= 0);
alter table public.profiles add column if not exists spendable_points int not null default 0 check (spendable_points >= 0);

with point_totals as (
  select
    p.id,
    greatest(
      p.total_points,
      coalesce(sum(l.points) filter (where l.points > 0), 0)::int
    ) as earned_points,
    greatest(p.total_points, 0) as current_spendable
  from public.profiles p
  left join public.points_ledger l on l.user_id = p.id
  group by p.id, p.total_points
)
update public.profiles p
set
  lifetime_points = point_totals.earned_points,
  spendable_points = point_totals.current_spendable,
  total_points = point_totals.earned_points
from point_totals
where p.id = point_totals.id;

create index if not exists profiles_lifetime_points_idx on public.profiles(lifetime_points desc);
create index if not exists profiles_spendable_points_idx on public.profiles(spendable_points desc);

create or replace function public.award_points(
  p_user_id uuid,
  p_points int,
  p_reason text,
  p_source_type public.points_source_type,
  p_source_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_points <= 0 then raise exception 'Points awarded must be positive'; end if;
  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;
  if p_source_type = 'admin_adjustment' and not public.is_admin(auth.uid()) then raise exception 'Admin required'; end if;

  insert into public.points_ledger(user_id, points, reason, source_type, source_id, created_by)
  values (p_user_id, p_points, p_reason, p_source_type, p_source_id, auth.uid());

  update public.profiles
  set
    lifetime_points = lifetime_points + p_points,
    spendable_points = spendable_points + p_points,
    total_points = lifetime_points + p_points
  where id = p_user_id;
end;
$$;

create or replace function public.redeem_points(
  p_user_id uuid,
  p_points int,
  p_reason text,
  p_source_type public.points_source_type,
  p_source_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
declare current_spendable int;
begin
  if p_points <= 0 then raise exception 'Points redeemed must be positive'; end if;
  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then raise exception 'Not authorized'; end if;

  select spendable_points into current_spendable from public.profiles where id = p_user_id for update;
  if current_spendable < p_points then raise exception 'Insufficient spendable points'; end if;

  insert into public.points_ledger(user_id, points, reason, source_type, source_id, created_by)
  values (p_user_id, -p_points, p_reason, p_source_type, p_source_id, auth.uid());

  update public.profiles
  set spendable_points = spendable_points - p_points
  where id = p_user_id;
end;
$$;

drop function if exists public.get_all_time_leaderboard();

create or replace function public.get_all_time_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, total_points int, rank bigint)
language sql stable security definer set search_path = public as $$
  select id, full_name, avatar_url, lifetime_points, dense_rank() over(order by lifetime_points desc)
  from public.profiles
  order by lifetime_points desc
  limit 50;
$$;

drop function if exists public.get_monthly_leaderboard();

create or replace function public.get_monthly_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, total_points bigint, rank bigint)
language sql stable security definer set search_path = public as $$
  with totals as (
    select p.id, p.full_name, p.avatar_url, coalesce(sum(l.points) filter (where l.points > 0), 0) as points
    from public.profiles p
    left join public.points_ledger l on l.user_id = p.id and l.created_at >= date_trunc('month', now())
    group by p.id, p.full_name, p.avatar_url
  )
  select id, full_name, avatar_url, points, dense_rank() over(order by points desc)
  from totals
  order by points desc
  limit 50;
$$;

create or replace function public.get_public_member_profile(p_user_id uuid)
returns table(
  user_id uuid,
  full_name text,
  avatar_url text,
  major text,
  graduation_year int,
  total_points int,
  all_time_rank bigint,
  joined_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select
      p.id,
      p.full_name,
      p.avatar_url,
      p.major,
      p.graduation_year,
      p.lifetime_points,
      p.created_at,
      rank() over (order by p.lifetime_points desc, p.created_at asc) as all_time_rank
    from public.profiles p
  )
  select
    r.id as user_id,
    r.full_name,
    r.avatar_url,
    r.major,
    r.graduation_year,
    r.lifetime_points as total_points,
    r.all_time_rank,
    r.created_at as joined_at
  from ranked r
  where r.id = p_user_id;
$$;

create or replace function public.register_for_tournament(p_tournament_id uuid)
returns table(status text, registration_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  tournament_row public.tournaments%rowtype;
  registration uuid;
  registration_count int;
  current_spendable int;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into tournament_row from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'Tournament not found';
  end if;
  if tournament_row.status <> 'registration_open' then
    raise exception 'Registration is not open';
  end if;

  if exists (
    select 1 from public.tournament_registrations
    where tournament_id = p_tournament_id and user_id = auth.uid()
  ) then
    return query select 'already_registered', null::uuid;
    return;
  end if;

  select count(*) into registration_count
  from public.tournament_registrations
  where tournament_id = p_tournament_id and tournament_registrations.status = 'registered';
  if registration_count >= tournament_row.max_players then
    raise exception 'Tournament is full';
  end if;

  select spendable_points into current_spendable
  from public.profiles
  where id = auth.uid()
  for update;

  if current_spendable is null then
    raise exception 'Profile not found';
  end if;

  if tournament_row.entry_cost_points is not null and tournament_row.entry_cost_points > 0 and current_spendable < tournament_row.entry_cost_points then
    raise exception 'Insufficient spendable points: you have %, but this tournament costs %', current_spendable, tournament_row.entry_cost_points;
  end if;

  insert into public.tournament_registrations(tournament_id, user_id)
  values (p_tournament_id, auth.uid())
  returning id into registration;

  if tournament_row.entry_cost_points is not null and tournament_row.entry_cost_points > 0 then
    perform public.redeem_points(auth.uid(), tournament_row.entry_cost_points, 'Tournament entry: ' || tournament_row.title, 'tournament', registration);
  end if;

  return query select 'registered', registration;
end;
$$;

drop policy if exists "profiles safe self update" on public.profiles;

create policy "profiles safe self update" on public.profiles
for update using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select role from public.profiles where id = auth.uid())
  and total_points = (select total_points from public.profiles where id = auth.uid())
  and lifetime_points = (select lifetime_points from public.profiles where id = auth.uid())
  and spendable_points = (select spendable_points from public.profiles where id = auth.uid())
);
