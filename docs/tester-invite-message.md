# What to send testers

Two variants. Use the internal one today; swap to the public-link one once Beta App Review
clears. Written 2026-08-26.

## Variant A — internal testers (available now, no Apple review)

You add each person in App Store Connect by the email on their **Apple ID**, not just any
address they use. That mismatch is the most common reason an invite appears to do nothing.

> Hey — I need testers for the QU Poker club app before we launch it. Takes 2 minutes.
>
> **iPhone:** install **TestFlight** from the App Store first. Then check your email for an
> invite from me and tap "View in TestFlight". If the button stalls, open TestFlight, tap
> **Redeem**, and type the code at the bottom of that email. Send me the Apple ID email your
> iPhone is signed in with so I can add you.
>
> **Android:** open this on your phone and tap download. Chrome will warn you it is not from
> the Play Store — allow it, that is just because we are not published yet:
> https://expo.dev/artifacts/eas/LqxraDCN8JrvPS5wmt64ki-OaM5q_UNT91B4oOw5mmU.apk
>
> **Signing up:** any email works, password needs 8+ characters. You will get an **8-digit
> code emailed to you — check your spam folder**, it hides there almost every time. Enter
> that code in the app.
>
> If you already made an account before, do NOT sign up again — it will look like it worked
> but no email sends. Use Log in, or Forgot password.
>
> Then just mess with everything — Dashboard, Events, Leaderboard, Tournaments, Play. Text me
> a screenshot of anything broken or confusing plus your phone model. To be clear there is no
> real money anywhere in this, it is club points only.

## Variant B — public link (after Beta App Review clears)

Replace both `XXXXXXXX` with the real tail of the join URL that App Store Connect shows you.

> Hey — I need testers for the QU Poker club app before we launch it. Takes 2 minutes.
>
> **iPhone:** install **TestFlight** from the App Store. Then either open
> https://testflight.apple.com/join/XXXXXXXX on your phone, or open TestFlight, tap
> **Redeem**, and enter code `XXXXXXXX`. Install QU Poker from there.
>
> **Android:** open this on your phone and tap download. Chrome will warn you it is not from
> the Play Store — allow it, that is just because we are not published yet:
> https://expo.dev/artifacts/eas/LqxraDCN8JrvPS5wmt64ki-OaM5q_UNT91B4oOw5mmU.apk
>
> **Signing up:** any email works, password needs 8+ characters. You will get an **8-digit
> code emailed to you — check your spam folder**, it hides there almost every time. Enter
> that code in the app.
>
> If you already made an account before, do NOT sign up again — it will look like it worked
> but no email sends. Use Log in, or Forgot password.
>
> Then just mess with everything — Dashboard, Events, Leaderboard, Tournaments, Play. Text me
> a screenshot of anything broken or confusing plus your phone model. To be clear there is no
> real money anywhere in this, it is club points only.

## Why those three warnings are in there

- **Spam folder.** Auth mail from a new Gmail sender lands there routinely.
- **Already have an account.** Supabase returns success with `identities: []` and sends no
  email at all, deliberately, so it cannot leak which addresses are registered. Testers read
  this as the app being broken.
- **No real money.** Sets expectations, and matches the non-gambling framing given to Apple.

## Expiry

The Android APK link dies **2026-09-09** (EAS artifact retention). Re-cut with
`npx eas build --platform android --profile preview` and update this file.

## Structured walkthrough

If you want exec board members following a script rather than free-roaming, hand them
`docs/exec-board-test-plan.md` instead.
