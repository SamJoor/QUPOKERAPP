create or replace function public.get_tournament_registrations_public(p_tournament_id uuid)
returns table(user_id uuid, full_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.user_id, p.full_name, r.status, r.created_at
  from public.tournament_registrations r
  join public.profiles p on p.id = r.user_id
  where r.tournament_id = p_tournament_id
  order by r.created_at asc;
$$;

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
  update public.profiles
  set
    full_name = p_full_name,
    student_id = p_student_id,
    graduation_year = p_graduation_year,
    major = p_major,
    avatar_url = p_avatar_url
  where id = auth.uid();
end;
$$;
