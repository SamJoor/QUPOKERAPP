# App Store submission — drafted 2026-08-26

Everything here is ready to paste into App Store Connect. Written from what the app
actually does, not from a template — check it reads true to you before submitting.

App Store Connect app ID: **6776849169** · Bundle ID: `com.qupoker.strategyclub`

---

## 1. App Information

**Name** (30 char max)
```
QU Poker Club
```

**Subtitle** (30 char max)
```
Club events, points & poker
```

**Primary category:** Social Networking
**Secondary category:** Education

Sports and Games are both worse fits. The app is a club membership tool — events,
attendance, points, member directory — with practice poker attached. Reviewers weigh
category against actual function, and "Games" invites gambling scrutiny you do not want.

**Support URL**
```
https://samjoor.github.io/QUPOKERAPP/support.html
```

**Privacy Policy URL**
```
https://samjoor.github.io/QUPOKERAPP/privacy.html
```

---

## 2. Description

```
QU Poker Club is the official app for the Quinnipiac University poker club.

Check in to club meetings by scanning a QR code at the door, earn club points for
showing up, and climb the semester leaderboard. Register for club tournaments,
follow results, and spend points on club rewards.

Between meetings, practise heads-up hands against other members to sharpen your
game before the next tournament.

FOR MEMBERS
- Scan a QR code at events to check in and earn points
- Track your points, attendance history, and redemptions
- See the club leaderboard and member profiles
- Register for tournaments and follow standings
- Redeem points for club rewards

FOR OFFICERS
- Post events and generate check-in QR codes
- Manage members, points, and reward redemptions
- Run tournaments and record results

PRACTICE POKER
- Heads-up play money hands against other members
- Match your friends directly or join the queue

Club points are a membership record. They have no cash value, cannot be bought or
sold, and cannot be exchanged for money. No gambling or wagering takes place in this
app — every hand is play money for practice.

Built by and for Quinnipiac students.
```

**Keywords** (100 char max, comma separated, no spaces after commas)
```
poker,club,quinnipiac,university,student,cards,tournament,leaderboard,campus,points,events
```

**Promotional text** (170 char max, editable without review)
```
New this semester: heads-up practice hands against other members, plus faster event
check-in. Find us at the engagement fair.
```

---

## 3. Age rating — read this before answering

The rating questionnaire asks about **Simulated Gambling**. This app has poker
gameplay, so answering "None" is not accurate and misdeclaring is a rejection risk.

Answer **Simulated Gambling: Infrequent/Mild** — the play is with valueless practice
chips, there is no purchase of chips, no cash-out, and no wagering of anything of
value. Expect roughly a 17+ rating; Apple rates simulated gambling conservatively.

Answer **No** to: contests, real-money gambling, unrestricted web access,
user-generated content, violence, mature themes.

Do not describe club points as currency anywhere in the listing. They are an
attendance record. The description above is worded carefully for this reason.

---

## 4. App Privacy questionnaire

**Yes**, the app collects data.

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App Functionality |
| Name | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Photos (profile picture) | Yes | Yes | No | App Functionality |
| Other User Content | Yes | Yes | No | App Functionality |
| Other Data (graduation year, major, student ID) | Yes | Yes | No | App Functionality |

**Not collected** — say No to all of these: Location, Contacts, Health & Fitness,
Financial Info, Browsing History, Search History, Purchases, Sensitive Info,
Diagnostics, Usage Data, Advertising Data, Device ID.

**Tracking: No.** There is no analytics SDK, no advertising identifier, and no data
shared with third parties for advertising. Answering yes here triggers App Tracking
Transparency requirements the app does not implement.

Camera is a *permission*, not a data type — it is not declared here because no image
is stored or transmitted from the scanner.

---

## 5. App Review Information — the part people forget

The entire app is behind a login wall. **A reviewer who cannot sign in will reject it,
usually within a day.** Fill in the demo account fields:

```
Sign-in required: YES
Username: <a real account email you have created>
Password: <its password>
```

Make that account an **admin** so the reviewer can see the officer console too:

```sql
update public.profiles set role = 'admin' where email = '<that email>';
```

**Notes field:**
```
QU Poker Club is a membership app for the Quinnipiac University poker club.

The demo account above is pre-verified and has officer (admin) permissions so all
screens are reachable, including the officer console.

Sign-up normally requires email verification by a code sent to the user's address.
The demo account is already verified, so no code is needed to sign in.

The poker feature uses play money only. Chips cannot be purchased, have no cash
value, and cannot be exchanged for money or prizes. No wagering takes place. Club
points are an attendance record for club members and likewise have no cash value.

QR scanning is used to check in to in-person club meetings. Camera access is
requested only on that screen.

Account deletion is available in-app under Profile > Delete Account.
```

---

## 6. Screenshots

Required: **6.9" (or 6.7") iPhone**. Apple accepts one size set and scales down.
Take them on your iPhone with side button + volume up. Five or six is plenty:

1. Dashboard with real data
2. Events list
3. Tournaments
4. The poker table mid-hand
5. Leaderboard
6. Profile

Sign in as a normal member first so nothing shows placeholder or empty states.
Avoid screenshots showing another member's real name if you can.

---

## 7. Before you hit submit

- [ ] Migrations 019 and 020 applied to production
- [ ] A build containing migration 020's `delete_own_account` is the one submitted
- [ ] Demo account created, verified, set to admin, credentials in Review Notes
- [ ] Screenshots uploaded
- [ ] App Privacy questionnaire completed
- [ ] Privacy Policy and Support URLs saved in App Information
- [ ] Age rating questionnaire answered with Simulated Gambling: Infrequent/Mild
- [ ] Export compliance — already handled by `ITSAppUsesNonExemptEncryption: false`

---

## 8. Likely rejection reasons, ranked

1. **No demo account** — the reviewer cannot get past login. Most common by far.
2. **Missing account deletion** — fixed by migration 020, but only if the submitted
   build contains it *and* the migration is applied.
3. **Gambling classification** — mitigated by the wording above and an honest age
   rating. If challenged, the reply is: play money, no purchase, no cash-out, no wager.
4. **Broken privacy URL** — fixed; both pages now resolve.
5. **Placeholder or empty screens in screenshots** — sign in with real data first.
