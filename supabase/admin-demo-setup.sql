-- Promote demo/officer accounts after they have signed up.
-- Edit the email list, then run in Supabase SQL Editor.
-- This updates only existing profile rows.

update public.profiles
set
  role = 'admin',
  updated_at = now()
where email in (
  'z8888ooz@gmail.com',
  'sebasmike21@gmail.com'
);

select email, full_name, role, lifetime_points, spendable_points
from public.profiles
where email in (
  'z8888ooz@gmail.com',
  'sebasmike21@gmail.com'
)
order by email;
