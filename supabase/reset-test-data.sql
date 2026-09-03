-- reset-test-data.sql - clear pre-launch test data. Written 2026-09-02.
--
-- Run top to bottom in the Supabase SQL Editor. Wrapped in a transaction, so if any
-- statement fails nothing is applied and you can fix it and re-run.
--
-- KEPT:
--   * rewards - club configuration, not seed data
--   * all real accounts: z8888ooz@ (your admin), samjoor9@, sebasmike21@ (Sebastian),
--     and the three club members who signed up from the TestFlight link on 2026-08-31
--     (joelle.tannenbaum@quinnipiac.edu, lukemele18@gmail.com, somoore@quinnipiac.edu)
--
-- REMOVED:
--   * all events, tournaments, attendance, points history, match and queue rows
--   * five throwaway test accounts
--
-- Activity rows go first. events.created_by and points_ledger.created_by reference
-- profiles with no delete rule, so they would block the account deletions below if any
-- survived.

begin;

delete from public.poker_match_players;
delete from public.poker_match_queue;
delete from public.poker_matches;
delete from public.daily_practice_claims;
delete from public.tournament_results;
delete from public.tournament_registrations;
delete from public.reward_redemptions;
delete from public.attendance;
delete from public.points_ledger;
delete from public.poker_friendships;
delete from public.tournaments;
delete from public.events;

-- Deleting the auth user cascades to profiles and everything keyed off it.
delete from auth.users
where email in (
  'samjoor9+launchtest@gmail.com',
  'alkaline2223@gmail.com',
  'alkaline2223+v1@gmail.com',
  'alkaline2223+code1@gmail.com',
  'alkaline2223+code2@gmail.com'
);

-- Everyone who remains starts level. spendable_points goes to 2000 rather than 0 to match
-- the default migration 022 set and the 2,000 practice balance the dashboard promises.
update public.profiles
set lifetime_points = 0,
    total_points = 0,
    spendable_points = 2000,
    updated_at = now();

commit;

-- Verification. Expect 7 accounts, and zeros everywhere except rewards.
select email, full_name, role, lifetime_points, spendable_points
from public.profiles
order by created_at;

select
  (select count(*) from public.events) as events,
  (select count(*) from public.tournaments) as tournaments,
  (select count(*) from public.attendance) as attendance,
  (select count(*) from public.points_ledger) as points_ledger,
  (select count(*) from public.tournament_registrations) as registrations,
  (select count(*) from public.poker_friendships) as friendships,
  (select count(*) from public.rewards) as rewards_kept;
