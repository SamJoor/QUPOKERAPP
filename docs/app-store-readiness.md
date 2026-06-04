# App Store Readiness Checklist

## Required Before TestFlight

- Replace placeholder app icon and splash images in `assets/`.
- Confirm `app.json` bundle identifier: `com.qupoker.strategyclub`.
- Add real EAS project ID.
- Add production Supabase URL and anon key.
- Run migrations `001` through `015`.
- Run `supabase/smoke-test.sql`.
- Confirm Privacy Policy URL is hosted publicly.
- Confirm Support URL is hosted publicly.
- Confirm Apple Universal Links domain if invite links should open the app.

## App Review Notes

Use language like:

> QU Poker is a university club engagement and poker strategy education app. It supports QR attendance, non-cash engagement points, club-approved rewards, friendly non-gambling tournaments, and strategy practice. No real-money wagering, deposits, withdrawals, cash-outs, casino wallet, or payment features are supported.

## Screenshot Checklist

- Welcome screen with non-gambling positioning.
- Dashboard showing lifetime/spendable points.
- Tournament Center with registration.
- Tournament table/seat assignment.
- Strategy Trainer or bot practice screen.
- Rewards screen.
- Officer QR attendance screen if showing admin features.

Avoid screenshots that imply cash prizes, betting, wagering, or casino gambling.

## Device QA

Use an iPhone through Expo development build or TestFlight. Expo Go is fine for early UI checks, but a development build is better for native linking, camera, storage, and final permissions.
