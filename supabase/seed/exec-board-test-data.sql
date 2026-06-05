-- Exec-board beta test data for QU Poker.
-- Run this in Supabase SQL Editor after migrations 001-015.
-- Replace the email below with the account you will use during testing.

do $$
declare
  test_email text := 'samjoor9@gmail.com';
  test_user_id uuid;
begin
  select id into test_user_id
  from public.profiles
  where email = test_email
  limit 1;

  if test_user_id is not null then
    update public.profiles
    set role = 'admin',
        lifetime_points = greatest(coalesce(lifetime_points, 0), 150),
        spendable_points = greatest(coalesce(spendable_points, 0), 125),
        total_points = greatest(coalesce(total_points, 0), 150),
        updated_at = now()
    where id = test_user_id;

    insert into public.points_ledger (user_id, points, reason, source_type, created_by)
    values
      (test_user_id, 75, 'Exec beta setup bonus', 'bonus', test_user_id),
      (test_user_id, 50, 'Tournament test balance', 'bonus', test_user_id)
    on conflict do nothing;
  end if;
end $$;

insert into public.events (
  title,
  description,
  location,
  starts_at,
  ends_at,
  event_type,
  points_awarded,
  qr_code_token,
  is_active
)
values
  (
    'Opening Strategy Night',
    'Welcome meeting, club overview, and hand-reading practice for new and returning members.',
    'Student Center 213',
    now() + interval '3 days',
    now() + interval '3 days' + interval '90 minutes',
    'meeting',
    25,
    encode(gen_random_bytes(16), 'hex'),
    true
  ),
  (
    'Beginner Tournament Workshop',
    'Friendly workshop covering tournament structure, table etiquette, and non-gambling competition rules.',
    'Echlin 101',
    now() + interval '8 days',
    now() + interval '8 days' + interval '2 hours',
    'workshop',
    35,
    encode(gen_random_bytes(16), 'hex'),
    true
  ),
  (
    'Spring Practice Recap',
    'Past event sample for testing the Past Events tab.',
    'Student Center 120',
    now() - interval '14 days',
    now() - interval '14 days' + interval '90 minutes',
    'social',
    20,
    encode(gen_random_bytes(16), 'hex'),
    true
  );

insert into public.rewards (
  title,
  description,
  cost_points,
  reward_type,
  stock,
  is_active
)
values
  ('Tournament Entry Credit', 'Redeem for one officer-approved friendly tournament entry.', 35, 'tournament_entry', 25, true),
  ('Custom Club Chip', 'A QU Poker commemorative chip with no cash value.', 60, 'custom_chip', 40, true),
  ('Merch Priority Pick', 'Early access to club-approved merch drops.', 90, 'merch', 10, true),
  ('Leaderboard Spotlight', 'Recognition in the club leaderboard recap.', 50, 'recognition', null, true);

insert into public.tournaments (
  title,
  description,
  starts_at,
  max_players,
  entry_cost_points,
  reward_points_first,
  reward_points_second,
  reward_points_third,
  status
)
values (
  'Exec Beta Sit & Go',
  'Small friendly tournament for testing registration, table assignment, and result submission.',
  now() + interval '10 days',
  18,
  35,
  100,
  60,
  35,
  'registration_open'
);
