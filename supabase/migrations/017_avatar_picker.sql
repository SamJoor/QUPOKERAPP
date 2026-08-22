-- Lets members pick one of the club's illustrated "head" avatars as an alternative to
-- uploading a real photo. avatar_key is a free-text identifier (no FK/check constraint) so
-- adding more illustrations later is just a new asset + a TS map entry, no migration required.
-- Precedence when rendering (see constants/avatarAssets.ts resolveAvatarSource): a real
-- avatar_url always wins over a picked avatar_key.

alter table public.profiles add column if not exists avatar_key text;

create or replace function public.update_own_profile(
  p_full_name text,
  p_student_id text default null,
  p_graduation_year int default null,
  p_major text default null,
  p_avatar_url text default null,
  p_avatar_key text default null
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
    avatar_url = p_avatar_url,
    avatar_key = p_avatar_key
  where id = auth.uid();
end;
$$;

create or replace function public.get_all_time_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, avatar_key text, total_points int, rank bigint)
language sql stable security definer set search_path = public as $$
  select id, full_name, avatar_url, avatar_key, lifetime_points, dense_rank() over(order by lifetime_points desc)
  from public.profiles
  order by lifetime_points desc
  limit 50;
$$;

create or replace function public.get_monthly_leaderboard()
returns table(user_id uuid, full_name text, avatar_url text, avatar_key text, total_points bigint, rank bigint)
language sql stable security definer set search_path = public as $$
  with totals as (
    select p.id, p.full_name, p.avatar_url, p.avatar_key, coalesce(sum(l.points) filter (where l.points > 0), 0) as points
    from public.profiles p
    left join public.points_ledger l on l.user_id = p.id and l.created_at >= date_trunc('month', now())
    group by p.id, p.full_name, p.avatar_url, p.avatar_key
  )
  select id, full_name, avatar_url, avatar_key, points, dense_rank() over(order by points desc)
  from totals
  order by points desc
  limit 50;
$$;

create or replace function public.get_public_member_profile(p_user_id uuid)
returns table(
  user_id uuid,
  full_name text,
  avatar_url text,
  avatar_key text,
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
      p.avatar_key,
      p.major,
      p.graduation_year,
      p.total_points,
      p.created_at,
      rank() over (order by p.total_points desc, p.created_at asc) as all_time_rank
    from public.profiles p
  )
  select
    r.id as user_id,
    r.full_name,
    r.avatar_url,
    r.avatar_key,
    r.major,
    r.graduation_year,
    r.total_points,
    r.all_time_rank,
    r.created_at as joined_at
  from ranked r
  where r.id = p_user_id;
$$;

create or replace function public.search_club_members(p_query text)
returns table(id uuid, full_name text, avatar_url text, avatar_key text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.avatar_key
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and nullif(trim(p_query), '') is not null
    and p.full_name ilike '%' || trim(p_query) || '%'
  order by p.full_name
  limit 20;
$$;
