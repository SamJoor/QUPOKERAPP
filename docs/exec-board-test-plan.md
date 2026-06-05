# QU Poker Exec Board Beta Test Plan

Use this for the first TestFlight/internal beta. This is not a general member launch checklist.

## Setup Before Invites

1. Run Supabase migrations through `015`.
2. Run `supabase/seed/exec-board-test-data.sql` in the Supabase SQL Editor.
3. Confirm the test admin account has `role = 'admin'`.
4. Build and submit the latest iOS build to TestFlight.

## Tester Instructions

Ask each tester to record:

- device model
- iOS version
- account email used
- screenshots for any issue
- what they expected vs what happened

## Member Flow

1. Install from TestFlight.
2. Create an account with email and password.
3. Complete profile with QU Student ID.
4. Confirm Dashboard shows:
   - lifetime points
   - spendable points
   - rank
   - upcoming event or clear empty state
5. Open Events.
6. Switch between Upcoming and Past Events.
7. Open Leaderboard.
8. Tap a member profile and confirm email/student ID are not visible.
9. Open Tournaments.
10. Register for the Exec Beta Sit & Go.
11. Confirm table/seat assignment appears.
12. Open Rewards through Dashboard > Redeem Points.
13. Attempt a reward redemption.
14. Open Play.
15. Test:
   - bot hand
   - strategy trainer
   - beta friend invite/queue area

## Officer Flow

1. Sign in with admin account.
2. Open Profile > Officer Console.
3. Create an event.
4. Confirm “Event posted” dialog appears.
5. Open event QR management.
6. Display/regenerate QR token.
7. Check attendance screen.
8. Add or adjust points for a member.
9. Create/edit a reward.
10. Open Tournament Director.
11. Create a tournament.
12. Open registration.
13. Submit results for a tournament.
14. Confirm Past Tournaments shows placements.

## Known Beta Limits

- Play > Friends is a beta validation area, not the final live multiplayer poker table.
- Push notifications are not enabled.
- Public app links require a real configured domain before launch.
- Support/privacy URLs must be real before App Store review.
