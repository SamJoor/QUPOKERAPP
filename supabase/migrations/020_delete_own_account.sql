-- 020_delete_own_account.sql
--
-- App Store Review Guideline 5.1.1(v): an app that lets users create an account must let
-- them initiate deletion of that account from inside the app. There was no way to do this,
-- which is a routine rejection for exactly this kind of app.
--
-- profiles.id references auth.users(id) on delete cascade, and 13 of the 17 tables that
-- reference profiles(id) cascade in turn, so deleting the auth user clears almost
-- everything. Two do not:
--
--   events.created_by        references public.profiles(id)   -- no delete rule
--   points_ledger.created_by references public.profiles(id)   -- no delete rule
--
-- Those default to NO ACTION and would abort the delete for anyone who has ever created an
-- event or had points awarded to them by an admin. They are audit columns rather than
-- ownership, so they are nulled first. Deleting a member must never destroy club history:
-- the event stays, it just no longer records which admin posted it.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  -- Audit columns, not ownership. Null them so club history survives the member leaving.
  update public.events set created_by = null where created_by = me;
  update public.points_ledger set created_by = null where created_by = me;

  -- Cascades through profiles and everything that references it.
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
