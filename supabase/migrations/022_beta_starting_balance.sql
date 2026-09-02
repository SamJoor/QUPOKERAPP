-- The beta is centered on event reminders and club updates. Give every member a
-- 2,000-point testing balance without inflating earned XP or leaderboard rank.

alter table public.profiles
  alter column spendable_points set default 2000;

-- This migration runs once, so existing beta members receive the same starting
-- floor as new signups without reducing any larger balance they already earned.
update public.profiles
set spendable_points = greatest(spendable_points, 2000)
where spendable_points < 2000;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, spendable_points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    2000
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
