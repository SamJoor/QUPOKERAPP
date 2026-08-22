# QU Poker & Strategy Club

Production-oriented Expo + React Native app for a university poker strategy club. The app focuses on member signups, attendance, QR check-ins, engagement points, rewards, friendly tournaments, education, leaderboards, practice poker matches, and community retention.

## Non-Gambling Disclaimer

This app is for poker strategy education, club engagement, and non-gambling competition only. No real-money wagering is supported.

The app does not include deposits, withdrawals, betting with money, cash-outs, casino wallets, real-money balances, or wagering. Points are club engagement points only and can be redeemed only for club-approved perks such as tournament entries, round boosts, gift cards, custom chips, merch, or recognition.

## Tech Stack

- React Native
- Expo
- TypeScript
- Expo Router
- Supabase Auth, Postgres, RLS, RPC functions, and Storage-ready profile fields
- React Native Paper
- Expo SecureStore
- Expo Camera / Barcode Scanner for QR attendance
- Expo Image Picker permission configuration for optional profile photos
- EAS Build and EAS Submit

## Setup

```bash
npm install
cp .env.example .env
```

Fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_INVITE_BASE_URL=https://qupoker.app
EXPO_PUBLIC_APP_STORE_URL=
```

Do not place a Supabase service role key in this mobile app. Privileged operations should stay in Supabase RPC functions, database policies, or server-side/Edge Function code.

### Offline demo data

The app can run without a backend on the fixtures in `lib/mockData.ts`, but this is **opt-in only**:

```bash
EXPO_PUBLIC_DEMO_MODE=1
```

Missing Supabase config on its own never activates demo data — it fails closed at the login
screen instead, so a release build with a broken `.env` cannot seat users in a fabricated
account. The demo profile has the `member` role, so admin screens are unavailable offline.

## Supabase Setup

1. Create a Supabase project.
2. In SQL Editor, run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_functionality_hardening.sql`
   - `supabase/migrations/003_event_qr_attendance_management.sql`
   - `supabase/migrations/004_launch_readiness.sql`
   - `supabase/migrations/005_poker_arena.sql`
   - `supabase/migrations/006_poker_invite_links.sql`
   - `supabase/migrations/007_public_member_profiles.sql`
   - `supabase/migrations/008_tournament_center.sql`
   - `supabase/migrations/009_tournament_registration_hardening.sql`
   - `supabase/migrations/010_lifetime_and_spendable_points.sql`
   - `supabase/migrations/011_tournament_registration_direct_spend.sql`
   - `supabase/migrations/012_tournament_table_assignments.sql`
   - `supabase/migrations/013_tournament_director_results.sql`
   - `supabase/migrations/014_profile_avatars_storage.sql`
   - `supabase/migrations/015_poker_live_realtime.sql`
   - `supabase/migrations/016_poker_hole_cards.sql`
   - `supabase/migrations/017_avatar_picker.sql`
3. Run `supabase/smoke-test.sql` to confirm key tables/functions exist.
4. Optionally run `supabase/seed/seed.sql` for development seed data.
5. Enable email auth providers as needed.
6. Add your project URL and anon key to `.env`.

The schema includes:

- `profiles`
- `events`
- `attendance`
- `points_ledger`
- `rewards`
- `reward_redemptions`
- `tournaments`
- `tournament_registrations`
- `tournament_results`
- `daily_practice_claims`
- `poker_friendships`
- `poker_match_queue`
- `poker_matches`
- `poker_match_players`

Security features include RLS, admin role checks, duplicate QR check-in prevention, duplicate daily practice prevention, atomic point award/redemption functions, separate lifetime and spendable point balances, protected reward/tournament flows, required student ID profile completion, and non-gambling poker match records that store practice chips only.

## Run Locally

```bash
npx expo start
```

For iOS:

```bash
npx expo start --ios
```

For a development build:

```bash
npx expo install expo-dev-client
eas build --profile development --platform ios
```

## EAS Build

The app is configured with:

- App name: `QU Poker`
- Slug: `qu-poker`
- URL scheme: `qupoker`
- iOS bundle identifier: `com.qupoker.strategyclub`
- Camera permission copy: `Camera access is used to scan club event QR codes for attendance check-in.`

Build for production:

```bash
eas build --profile production --platform ios
```

## EAS Submit / TestFlight

After the production build finishes:

```bash
eas submit --profile production --platform ios
```

In App Store Connect, use compliance notes that clearly state:

- The app is a university club engagement and education app.
- It does not support real-money gambling.
- It does not support betting, deposits, withdrawals, or cash-outs.
- Points are non-cash engagement points only.
- Friendly tournaments are non-gambling competitions for recognition and club rewards only.

## Friend Invite Links

The Play tab can create an iMessage-friendly practice match invite link. In development, the app can open custom scheme links like:

```text
qupoker://invite/INVITE_TOKEN
```

For App Store-style behavior, use a real HTTPS domain in `EXPO_PUBLIC_INVITE_BASE_URL`, for example:

```text
https://qupoker.app/invite/INVITE_TOKEN
```

To make that link open the app when installed and show an App Store/download page when not installed:

1. Replace the placeholder `applinks:qupoker.app` in `app.json` with your real domain.
2. Host an Apple `apple-app-site-association` file on that domain for `/invite/*`.
3. Make the web `/invite/:token` page show an App Store button using `EXPO_PUBLIC_APP_STORE_URL`, and optionally a button that opens `qupoker://invite/:token`.
4. After the App Store listing exists, add the real App Store URL to `.env`.

## First Admin User

1. Sign up in the app with the officer email.
2. In Supabase SQL Editor, promote the user:

```sql
update public.profiles
set role = 'admin'
where email = 'officer@example.edu';
```

3. Log out and back in.
4. Open Profile, then Officer Console.

## App Store Compliance Notes

- No payment or wallet features are present.
- Camera is requested only for QR attendance.
- Photo library permission is scoped to optional profile photo selection.
- Student ID is required for membership verification and should be used only by officers for club eligibility/admin purposes.
- The non-gambling disclaimer appears on welcome, dashboard, about/rules, event detail, and strategy trainer surfaces.
- Poker Arena practice chips have no cash value and are not tied to deposits, withdrawals, payouts, or club engagement point balances.
- Keep screenshots and metadata away from casino language, cash prizes, wagering terms, or anything that implies monetary gambling.

See also:

- `docs/privacy-policy.md`
- `docs/app-store-readiness.md`
- `docs/device-qa-checklist.md`

## Project Structure

```text
app/                 Expo Router screens
components/          Reusable mobile UI components
constants/           Theme and required disclaimer
lib/                 Supabase client, service layer, poker evaluator
supabase/migrations/ Database schema, RLS, RPC functions
supabase/seed/       Development seed data
assets/              Placeholder icon and splash assets
```
