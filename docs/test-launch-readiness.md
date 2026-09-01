# Test Launch Readiness

Target: a test launch to real club users by **2026-08-31**.
State captured 2026-08-24, on branch `agent/mobile-redesign-ai-lobby`.

This is the current-state companion to `app-store-readiness.md`. That checklist covers what
Apple needs; this one covers what stands between today and putting the app in front of users.

## Blockers

Ordered by what fails first if ignored.

### 1. The app has never been run with a real session

Every verification so far has been pre-login. The dashboard, leaderboard, tournaments, the new
heads-up match flow, and the avatar picker have **not** been exercised against the live
Postgres by anyone. `profiles` correctly returns nothing to an anonymous caller, so RLS hides
all of it until someone signs in.

This is the largest unknown on the list and it gates everything below it — a problem found here
can reshuffle the whole plan. Do it first.

- [ ] Sign in and walk every tab
- [ ] Walk the admin section with an admin account
- [ ] Play one heads-up match end to end

### 2. Email delivery will not survive a signup night

The project uses Supabase's built-in mailer, which is rate-limited to a handful of messages per
hour and is not intended for production. Email confirmation **is** required
(`mailer_autoconfirm: false`), so every new member needs a message to land. On club signup
night the fifth person to register gets nothing and simply cannot get in.

- [ ] Configure custom SMTP (Resend, Postmark, SendGrid) in the Supabase dashboard
- [ ] Send a real test signup through it

Dashboard work — no code change needed.

### 3. The email confirmation fix is unverified end to end

`signUp()` now passes `emailRedirectTo` pointing at the new `/auth/confirm` screen
(`lib/auth.ts`, commit `165c777`). The screen renders and fails closed correctly when handed no
token, but **no real confirmation email has ever been clicked**. Before this fix the link went
to the project Site URL, which on a phone opens a browser page that is not the app.

- [ ] Sign up with a throwaway address
- [ ] Open the confirmation link **on a phone**, not a desktop browser
- [ ] Confirm it lands in the app and the session is live

Check that the Supabase Site URL and the `qupoker` scheme are both configured as allowed
redirect targets.

### 4. Nothing is pushed, and the branch has never been merged

Four commits sit local-only on `agent/mobile-redesign-ai-lobby`, which is itself 4 commits
ahead of `main` and unmerged. No test build can come from work that only exists on one laptop.

- [ ] Push the branch
- [ ] Merge to `main` (or decide to build from the branch deliberately)
- [ ] Cut an EAS build and get it into TestFlight

Allow real time here: TestFlight review is usually hours but is not guaranteed same-day, and it
sits between you and users. Working backwards from 2026-08-31, this needs to start early in the
week, not on the last day.

## Done since 2026-08-21

| Commit | What |
| --- | --- |
| `91852cf` | Tab bar no longer covers content on the four full-bleed screens |
| `b30d2d4` | Demo data is opt-in; a missing `.env` can no longer grant an admin session |
| `165c777` | Confirmation emails deep-link back into the app via `/auth/confirm` |
| `59d8a80` | 25 tests for the heads-up match engine, plus CI, plus dependency hygiene |

Also verified: all 17 migrations are applied to the live project, `expo-doctor` passes 18/18,
`expo lint` is clean, typecheck is clean, and `npm audit` critical/low are cleared. Remaining
audit findings are dev-only build tooling that never ships in the bundle and require Expo 57.

## Known rough edges, not blockers

- **The Training tile is a visible dead end.** `app/tabs/dashboard.tsx` renders it disabled and
  labeled "coming soon." Fine for a friendly test group; Apple sometimes rejects visibly
  non-functional UI, so hide it before a real submission.
- **Admin screens are unavailable in offline demo mode by design.** The demo profile is a
  `member` now. Anyone doing offline UI work on admin screens has to change that knowingly.
- **Only the match engine has tests.** `lib/pokerMatch.ts` is covered; nothing else is.
- **Expo 57** is the only path to clearing the remaining audit advisories. A major upgrade is
  not a launch-week activity.

## Deliberately out of scope for a test launch

- Deleting the demo-data layer entirely (~80 guards across 12 files). It is now opt-in and
  fails closed, which is enough for a test launch. Revisit before a public release.
