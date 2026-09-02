-- 024_contact_card_drop_email.sql
--
-- 023 added get_member_contact_card as security definer, guarded only by
-- `auth.uid() is not null`. That is every signed-in member, and the grant is to the
-- `authenticated` role with no further role check, so any member could call it with any
-- user id and read that person's email address.
--
-- app/tabs/dashboard.tsx:288 calls it for whoever is tapped on the leaderboard and copies
-- the email into component state, but nothing renders it - the field is dead weight in the
-- UI and a disclosure over the API. docs/exec-board-test-plan.md step 8 asks a tester to
-- confirm email is not visible on another member's profile, which 023 quietly broke.
--
-- Dropping the column from the return type is enough. The remaining fields - name and
-- avatar - are already on the public leaderboard, so nothing new is exposed and no client
-- change is needed.
--
-- The return type changes, so the function has to be dropped rather than replaced.

drop function if exists public.get_member_contact_card(uuid);

create function public.get_member_contact_card(p_user_id uuid)
returns table(
  user_id uuid,
  full_name text,
  avatar_url text,
  avatar_key text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.avatar_key
  from public.profiles p
  where p.id = p_user_id
    and auth.uid() is not null;
$$;

revoke all on function public.get_member_contact_card(uuid) from public;
revoke all on function public.get_member_contact_card(uuid) from anon;
grant execute on function public.get_member_contact_card(uuid) to authenticated;
