create or replace function public.get_member_contact_card(p_user_id uuid)
returns table(
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  avatar_key text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email, p.avatar_url, p.avatar_key
  from public.profiles p
  where p.id = p_user_id
    and auth.uid() is not null;
$$;

revoke all on function public.get_member_contact_card(uuid) from public;
revoke all on function public.get_member_contact_card(uuid) from anon;
grant execute on function public.get_member_contact_card(uuid) to authenticated;
