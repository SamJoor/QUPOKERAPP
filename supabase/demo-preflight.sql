-- QU Poker demo readiness checks.
-- Run this in the Supabase SQL Editor before sending TestFlight invites.
-- It does not modify data.

select 'profiles table' as check_name,
  to_regclass('public.profiles') is not null as ok;

select 'events table' as check_name,
  to_regclass('public.events') is not null as ok;

select 'tournaments table' as check_name,
  to_regclass('public.tournaments') is not null as ok;

select 'rewards table' as check_name,
  to_regclass('public.rewards') is not null as ok;

select 'points columns' as check_name,
  count(*) filter (where column_name = 'lifetime_points') = 1 as has_lifetime_points,
  count(*) filter (where column_name = 'spendable_points') = 1 as has_spendable_points
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles';

select 'admin accounts' as check_name,
  count(*) as admin_count,
  coalesce(string_agg(email, ', ' order by email), '') as admin_emails
from public.profiles
where role = 'admin';

select 'active upcoming events' as check_name,
  count(*) as event_count
from public.events
where is_active = true
  and starts_at >= now();

select 'active rewards' as check_name,
  count(*) as reward_count
from public.rewards
where is_active = true;

select 'open tournaments' as check_name,
  count(*) as tournament_count
from public.tournaments
where status = 'registration_open';

select 'required rpc functions' as check_name,
  array_agg(proname order by proname) as found_functions
from pg_proc
where proname in (
  'award_points',
  'redeem_points',
  'check_in_event',
  'redeem_reward',
  'claim_daily_practice',
  'register_for_tournament',
  'submit_tournament_result',
  'get_tournament_table_seats',
  'get_tournament_overview',
  'create_poker_invite',
  'accept_poker_invite',
  'update_poker_match_state',
  'get_poker_match_history'
);

select 'demo readiness summary' as check_name,
  (select count(*) from public.profiles where role = 'admin') > 0 as has_admin,
  (select count(*) from public.events where is_active = true and starts_at >= now()) > 0 as has_upcoming_event,
  (select count(*) from public.rewards where is_active = true) > 0 as has_rewards,
  (select count(*) from public.tournaments where status = 'registration_open') > 0 as has_open_tournament;
