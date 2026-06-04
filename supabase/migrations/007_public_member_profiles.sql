drop function if exists public.get_public_member_profile(uuid);

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
      p.total_points,
      p.created_at,
      rank() over (order by p.total_points desc, p.created_at asc) as all_time_rank
    from public.profiles p
  )
  select
    r.id as user_id,
    r.full_name,
    r.avatar_url,
    r.major,
    r.graduation_year,
    r.total_points,
    r.all_time_rank,
    r.created_at as joined_at
  from ranked r
  where r.id = p_user_id;
$$;
