insert into public.profiles (id, full_name, email, graduation_year, major, role, total_points)
values
  ('00000000-0000-0000-0000-000000000001', 'Maya Chen', 'maya.chen@example.edu', 2026, 'Computer Science', 'admin', 820),
  ('00000000-0000-0000-0000-000000000002', 'Jordan Lee', 'jordan.lee@example.edu', 2027, 'Finance', 'member', 690),
  ('00000000-0000-0000-0000-000000000003', 'Alex Quinn', 'alex.quinn@example.edu', 2027, 'Marketing', 'member', 420),
  ('00000000-0000-0000-0000-000000000004', 'Sam Patel', 'sam.patel@example.edu', 2028, 'Data Science', 'member', 380),
  ('00000000-0000-0000-0000-000000000005', 'Nia Brooks', 'nia.brooks@example.edu', 2026, 'Psychology', 'member', 330),
  ('00000000-0000-0000-0000-000000000006', 'Chris Morgan', 'chris.morgan@example.edu', 2029, 'Economics', 'member', 240),
  ('00000000-0000-0000-0000-000000000007', 'Riley Stone', 'riley.stone@example.edu', 2028, 'Math', 'member', 210),
  ('00000000-0000-0000-0000-000000000008', 'Taylor King', 'taylor.king@example.edu', 2027, 'English', 'member', 180),
  ('00000000-0000-0000-0000-000000000009', 'Ava Rivera', 'ava.rivera@example.edu', 2026, 'Biology', 'member', 130),
  ('00000000-0000-0000-0000-000000000010', 'Noah Evans', 'noah.evans@example.edu', 2029, 'Undeclared', 'member', 90)
on conflict (id) do nothing;

insert into public.events (title, description, location, starts_at, ends_at, event_type, points_awarded, qr_code_token, created_by)
values
  ('Opening Strategy Night', 'Meet the club and practice hand ranges in a non-gambling setting.', 'Student Center 214', now() + interval '1 day', now() + interval '1 day 2 hours', 'meeting', 25, 'opening-strategy-night', '00000000-0000-0000-0000-000000000001'),
  ('Philanthropy Chip Count', 'Help run a campus service fundraiser and earn club engagement points.', 'Carl Hansen Lobby', now() + interval '4 days', now() + interval '4 days 2 hours', 'philanthropy', 40, 'philanthropy-chip-count', '00000000-0000-0000-0000-000000000001'),
  ('Probability Workshop', 'Learn pot odds as probability education without wagering.', 'Library 301', now() + interval '7 days', now() + interval '7 days 90 minutes', 'workshop', 30, 'probability-workshop', '00000000-0000-0000-0000-000000000001'),
  ('Friendly Final Table', 'Club tournament for recognition points only.', 'Game Room', now() + interval '10 days', now() + interval '10 days 3 hours', 'tournament', 35, 'friendly-final-table', '00000000-0000-0000-0000-000000000001'),
  ('Social Card Night', 'Meet members and practice table etiquette.', 'Commons Lounge', now() + interval '14 days', now() + interval '14 days 2 hours', 'social', 20, 'social-card-night', '00000000-0000-0000-0000-000000000001')
on conflict (qr_code_token) do nothing;

insert into public.rewards (title, description, cost_points, reward_type, stock)
values
  ('Friendly Tournament Entry', 'A seat in a club-approved non-gambling tournament.', 100, 'tournament_entry', 24),
  ('Round Boost', 'Recognition boost for a friendly practice round.', 150, 'round_boost', 20),
  ('Campus Gift Card', 'Officer-approved gift card perk.', 500, 'gift_card', 8),
  ('Custom Club Chip', 'Keepsake chip with no cash value.', 250, 'custom_chip', 15),
  ('Club Hoodie Raffle Entry', 'Merch raffle entry for active members.', 300, 'merch', 12);

insert into public.tournaments (title, description, starts_at, max_players, entry_cost_points, reward_points_first, reward_points_second, reward_points_third, status)
values
  ('Thursday Friendly Final Table', 'Non-gambling tournament focused on table talk, position, and hand reading.', now() + interval '7 days', 32, 100, 150, 100, 50, 'registration_open'),
  ('Freshman Strategy Invitational', 'Beginner-friendly practice tournament with recognition points only.', now() + interval '21 days', 24, null, 100, 60, 30, 'upcoming');

insert into public.points_ledger (user_id, points, reason, source_type, created_by)
select id, total_points, 'Seed leaderboard balance', 'bonus', '00000000-0000-0000-0000-000000000001'
from public.profiles
where total_points > 0;
