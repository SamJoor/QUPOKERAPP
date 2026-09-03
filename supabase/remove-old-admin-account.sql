-- remove-old-admin-account.sql - retire z8888ooz@gmail.com. Written 2026-09-02.
--
-- z8888ooz@gmail.com is currently the only admin besides the App Review demo account.
-- Deleting it without promoting another real account first would leave the officer console
-- reachable only by the account Apple uses, which you would then be sharing with a reviewer.
--
-- So samjoor9@gmail.com is promoted first, in the same transaction. If the promotion fails
-- the delete does not happen.

begin;

update public.profiles
set role = 'admin', updated_at = now()
where email = 'samjoor9@gmail.com';

-- Refuse to continue if that did not land - better to roll back than to be locked out.
do $$
begin
  if not exists (select 1 from public.profiles where email = 'samjoor9@gmail.com' and role = 'admin') then
    raise exception 'samjoor9@gmail.com is not admin; not deleting the other account';
  end if;
end $$;

-- Cascades to profiles and everything keyed off it. Nothing else references this account:
-- events and points_ledger are already empty, so the created_by columns cannot block it.
delete from auth.users where email = 'z8888ooz@gmail.com';

commit;

-- Expect 6 rows, with samjoor9@gmail.com and qupoker.demo@gmail.com as the admins.
select email, full_name, role, total_points, spendable_points
from public.profiles
order by created_at;
