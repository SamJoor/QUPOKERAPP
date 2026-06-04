# Device QA Checklist

Run this on a real iPhone before TestFlight.

## Auth

- New user can sign up.
- User can complete profile with required QU Student ID.
- Closing and reopening the app keeps the user signed in.
- Log out returns to welcome/login.

## Events

- Events tab loads upcoming events.
- Admin can create event and display QR code.
- Member can scan QR code with camera.
- Duplicate check-in does not award points twice.

## Points

- Attendance adds lifetime and spendable points.
- Rewards and tournament entry subtract spendable only.
- Lifetime points remain visible on leaderboard/public profile.

## Tournaments

- Admin creates tournament.
- Admin opens/closes registration.
- Member registers.
- Member receives table and seat assignment.
- Registered button replaces spend button.
- Admin submits placements from registered players.
- Admin marks tournament completed.
- Past Tournaments shows placements.

## Poker Arena

- Bot match can play through showdown.
- Invite link can be shared.
- Queue button creates/updates queue status.
- Active matches and match history load.

## Rewards

- Rewards load.
- Member can redeem when enough spendable points exist.
- Redemption appears in profile history.

## Admin

- Non-admin cannot access officer console.
- Admin can adjust points.
- Admin can manage rewards, events, tournaments, and members.

## Permissions

- Camera prompt mentions QR check-in only.
- Photo prompt mentions optional profile photo only.
