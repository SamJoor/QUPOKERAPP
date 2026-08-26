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

1. Sign up in the app with an email you control
2. Confirm it with the emailed code
3. Promote it to admin so the officer console is reachable:

```sql
update public.profiles set role = 'admin' where email = '<demo email>';
```

4. Sign out and sign back in once to prove the credentials work

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

Account deletion is available in-app under Profile > Delete Account.
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
