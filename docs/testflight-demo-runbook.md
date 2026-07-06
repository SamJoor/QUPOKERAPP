# TestFlight Demo Runbook

Use this for the first exec-board QA demo.

## Current Build

- App: QU Poker
- iOS version: `1.0.0`
- Build number: `8`
- EAS build ID: `14dcd7dc-59b6-4ca2-8d9b-3e3d5df234e2`
- EAS submission ID: `9cdd6259-32a8-4dd1-ba48-1c0390d47635`
- EAS build page: https://expo.dev/accounts/samjoor50/projects/qu-poker/builds/14dcd7dc-59b6-4ca2-8d9b-3e3d5df234e2
- EAS submission page: https://expo.dev/accounts/samjoor50/projects/qu-poker/submissions/9cdd6259-32a8-4dd1-ba48-1c0390d47635

## Before Sending Invites

1. Wait for Apple to finish processing build `1.0.0 (8)` in App Store Connect.
2. In App Store Connect, add the build to the internal TestFlight group.
3. Confirm Supabase migrations `001` through `015` are applied.
4. Run `supabase/smoke-test.sql`.
5. Run `supabase/demo-preflight.sql` and confirm the final summary row is all `true`.
6. If demo data is needed, run `supabase/seed/exec-board-test-data.sql`.
7. Confirm at least one officer account has `profiles.role = 'admin'`.

## Tester Message

Install QU Poker from TestFlight and test it like a club member first:

1. Sign up with email and password.
2. Complete your profile, including student ID.
3. Check Dashboard, Events, Leaderboard, Rewards, Tournaments, and Play.
4. Register for the demo tournament if points are available.
5. Tap a leaderboard profile and confirm private info is hidden.
6. Try password reset if you are willing to test auth email delivery.

For any issue, send:

- screenshot or screen recording
- device model
- iOS version
- account email used
- what you tapped
- what you expected
- what happened

## Officer QA Script

Use an admin account and test:

1. Create an event and confirm the posted dialog appears.
2. Open event QR tools and regenerate/display a QR token.
3. Adjust points for a member.
4. Create or edit a reward.
5. Create a tournament, open registration, register a member, confirm table/seat assignment, submit placements, and confirm past tournament results.
6. Confirm a non-admin account cannot access officer tools.

## Known Beta Limits

- Live multiplayer poker is still beta/scaffolded. Bot play and invite/queue flows should be tested, but this is not final Chess.com-level multiplayer yet.
- Push notifications are not enabled.
- Public support/privacy URLs in app config should be replaced with real hosted pages before App Store review.
- Invite links need a real Universal Links domain before public launch.

## Non-Gambling Review Note

QU Poker is a university club engagement and poker strategy education app. It supports QR attendance, non-cash engagement points, club-approved rewards, friendly non-gambling tournaments, and strategy practice. No real-money wagering, deposits, withdrawals, cash-outs, casino wallet, or payment features are supported.
