-- Run after migrations 001 through 015.
-- Replace these IDs/emails with users and tournaments in your project.

select 'profiles columns' as check_name,
  count(*) filter (where column_name in ('lifetime_points', 'spendable_points')) as found_columns
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles';

select 'tournament tables exist' as check_name,
  to_regclass('public.tournament_tables') is not null as ok,
  to_regclass('public.tournament_table_seats') is not null as seats_ok;

select 'poker realtime tables exist' as check_name,
  to_regclass('public.poker_match_actions') is not null as ok;

select 'required rpc functions' as check_name, proname
from pg_proc
where proname in (
  'register_for_tournament',
  'submit_tournament_result',
  'get_tournament_table_seats',
  'get_tournament_overview',
  'create_poker_invite',
  'accept_poker_invite',
  'update_poker_match_state',
  'get_poker_match_history'
)
order by proname;
