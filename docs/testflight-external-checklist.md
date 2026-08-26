# External TestFlight checklist — public invite link

Goal: a shareable `https://testflight.apple.com/join/XXXXXXXX` link whose 8-character tail
also works as a redeem code in the TestFlight app. Written 2026-08-26, branch
`agent/mobile-redesign-ai-lobby` at `3f1fca3`.

This is the **Beta App Review** subset of `APP_STORE_SUBMISSION.md`. Beta review checks that
the app launches, that a reviewer can sign in, and that nothing obviously breaks a guideline.
It does not check your store listing.

## Already done — verified 2026-08-26

- Privacy page live: https://samjoor.github.io/QUPOKERAPP/privacy.html (HTTP 200)
- Support page live: https://samjoor.github.io/QUPOKERAPP/support.html (HTTP 200)
- `app.json` `extra.supportUrl` / `extra.privacyPolicyUrl` point at both
- Migration `020_delete_own_account` applied to production — RPC probed live, `anon` denied
  and `authenticated` granted, which is the intended grant pair
- Migration `021_fix_event_qr_column_grant` applied — table-level SELECT on `events` is gone
  and the column list is granted back
- Export compliance handled by `ITSAppUsesNonExemptEncryption: false` in `app.json`
- **Demo account created and verified 2026-08-26** — `qupoker.demo@gmail.com`, user
  `61f60ebd-9dc5-4c09-b0c7-7a5a6ae85690`. The password is deliberately not recorded here: this
  repo is public and `docs/` is served by GitHub Pages, and the account is an admin on the
  production database. It lives in `.env.local` as `DEMO_ACCOUNT_PASSWORD` and in App Store
  Connect. Confirmed at creation with
  no email sent, `role = 'admin'`, student ID `DEMO0001`. Password sign-in returns a session,
  the profile reads back through RLS, and the admin-only `admin_event_qr_tokens` RPC answers
  200, so the officer console is reachable.

## Still to do

### 1. Cut a build from current HEAD

Build 15 (`52468b1`) is four commits behind and predates in-app account deletion, which is
guideline 5.1.1(v) and a routine rejection. It also predates the URL fix.

```bash
npx eas build --platform ios --profile production --auto-submit
```

`autoIncrement` is on, so this becomes build 16. Allow 10-60 min for Apple to finish
processing after upload before the build can be attached to a group.

### 2. Create the demo account

**The single most common Beta App Review rejection is a reviewer who cannot get past login.**
The whole app is behind auth, and a reviewer cannot self-register because signup requires an
8-digit code emailed to an address they do not control.

Scripted. Put a service role key in `.env.local` (gitignored via `.env.*`, and **not** given an
`EXPO_PUBLIC_` prefix, which would inline it into the shipped bundle):

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Get it from Supabase: Project Settings -> API -> Project API keys -> service_role -> Reveal.

```bash
node scripts/create-demo-account.mjs
```

That creates the account with `email_confirm: true`, so no code is ever sent, then patches the
profile to `role = 'admin'` with a student ID and grad year so the reviewer lands on the
dashboard instead of the onboarding form. It prints the credentials to paste into ASC. Re-runs
are safe: an existing account gets its password reset and confirmation forced.

Sign in with the printed credentials once on a device before submitting.

Already run on 2026-08-26 — see the verified list above. Re-run it only to rotate the password
or rebuild the account.

### 3. Test Information

App Store Connect -> QU Poker -> TestFlight -> Test Information.

| Field | Value |
| --- | --- |
| Feedback Email | samjoor9@gmail.com |
| Privacy Policy URL | https://samjoor.github.io/QUPOKERAPP/privacy.html |
| Marketing URL | https://samjoor.github.io/QUPOKERAPP/ |

**What to Test:**

```
Sign up with an email and password, confirm with the 8-digit code that is emailed to
you, then complete your profile.

Walk every tab: Dashboard, Events, Leaderboard, Tournaments, and Play. Register for a
tournament, open Rewards from the Dashboard, and try a practice hand against the bot.

Report anything that looks broken or confusing, with a screenshot and your phone model.

Known limits in this build: the Training tile is disabled, live multiplayer is still
scaffolded, and push notifications are not enabled.
```

### 4. Beta App Review Information

Same screen, lower section.

- **Sign-in required:** YES, with the demo account email and password from step 2
- **Contact info:** your name, email, phone

**Review Notes:**

```
QU Poker Club is a membership app for the Quinnipiac University poker club.

The demo account above is pre-verified and has officer (admin) permissions so all
screens are reachable, including the officer console.

Sign-up normally requires email verification by a code sent to the user's address.
The demo account is already verified, so no code is needed to sign in. Please use it
rather than registering a new account.

The poker feature uses play money only. Chips cannot be purchased, have no cash
value, and cannot be exchanged for money or prizes. No wagering takes place. Club
points are an attendance record for club members and likewise have no cash value.
There are no deposits, withdrawals, cash-outs, or payment features of any kind.

QR scanning is used to check in to in-person club meetings. Camera access is
requested only on that screen.

Account deletion is available in-app under Profile > Account settings > Delete Account.
The Officer Console is in the same place.
```

### 5. Create the group and enable the link

TestFlight tab -> Testers & Groups -> **+** -> Create New Group. Must be **External**, not
internal. Open it, find Public Link, click Enable Public Link.

Then Builds -> **+** -> add build 16. That is what submits it to Beta App Review.

## Not required for beta review

Screenshots, app description, keywords, promotional text, and the App Privacy nutrition
label are App Store release requirements. The age rating questionnaire is not part of beta
review either, though App Store Connect will ask eventually — answer Simulated Gambling as
Infrequent/Mild per `APP_STORE_SUBMISSION.md` section 3.

## Timing

Processing 10-60 min, then Beta App Review typically a few hours to 24h, occasionally 48h.
Later builds in the same version train usually clear much faster.

**Hedge:** internal testers need no review at all. Once build 16 finishes processing you can
add up to 100 people by Apple ID email and they can test within the hour, while external
review runs in parallel. See `docs/tester-invite-message.md` for what to send them.
