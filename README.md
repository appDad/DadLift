# DadLift

Personal workout PWA — daily deterministic dumbbell + med ball circuits, stick-figure
form animations, spoken rep counting, streaks, stats, and an AI coach line after every
workout. React + Vite on Firebase (Hosting, Auth, Firestore, AI Logic, App Check).

## Stack

- Vite + React (JS, inline styles — no Tailwind, no component libs)
- Firebase project: **dadlift** — Hosting, Google Auth, Firestore (offline-enabled),
  AI Logic (Gemini Developer API), App Check (reCAPTCHA Enterprise)

## Local dev (CMD)

```
cd C:\dadlift
npm install
copy .env.example .env.local
:: edit .env.local — paste the values from Firebase console -> Project settings -> Your apps
npm run dev
```

All Firebase config lives in `.env.local` (gitignored) — nothing is hard-coded in the
repo. Note these are publishable client identifiers, not server secrets: Vite inlines
them into the built bundle at build time, which is how every client-side Firebase app
works. Real protection comes from Firestore rules, App Check, and the key's
referrer/API restrictions in Cloud console.

First run prints an **App Check debug token** in the browser devtools console
(`AppCheck debug token: xxxxxxxx-...`). Register it so local dev keeps working once
App Check enforcement is turned on:
Firebase console → App Check → Apps → DadLift → ⋮ → **Manage debug tokens** → Add.
Until enforcement is enabled, everything works even without registering it.

> **Box-sync note:** if this folder is Box-synced and `node_modules` gets corrupted,
> don't fight it — delete `node_modules` and run `npm install` again.

## Deploy (CMD)

```
cd C:\dadlift
npm run build
"C:\Users\egabel\AppData\Roaming\npm\firebase.cmd" deploy --only hosting,firestore:rules
```

Live at **https://dadlift.web.app**

## Users / access control

- Google sign-in only. Being signed in is not enough — the account must be the admin
  or on the allowlist.
- **Admin email** is hardcoded in two places (keep them in sync):
  - `src/firebase.js` → `ADMIN_EMAIL`
  - `firestore.rules` → `adminEmail()`
- The admin sees a **users** button on the home screen: add an email to grant access,
  remove to revoke. No Firebase console needed. Each user's data lives under
  `users/{uid}/kv/*` and is private to them.

## Stats & logging

- Every workout ends on an **editable summary** screen: each set is prefilled with what
  the counter saw (HIIT rep sets are max-effort — you punch in the number) and can be
  corrected before saving. Quitting early (✕ end) also lands there, crediting partial work.
- Saved history entry:
  `{ d, ts, rounds, reps, n, mode, exDone, totalReps, totalSecs, groups{}, exercises[] }`
- The **stats** screen charts workouts/week, exercises/week, reps/week,
  muscle-group split (sets actually completed), current/best streak, and recent sessions.
- Home has a **FOCUS** picker (balanced or one muscle group). A focus day gives that
  group 4 of the 8 daily slots. Same day + same focus = same workout.
- The library includes bodyweight/calisthenics exercises (push-up variants, chair dips,
  pike push-ups, mountain climbers, leg raises…) — no equipment required.
- **Ratings**: thumbs up / neutral / down per exercise (DONE screen or library).
  The daily picker weights them 3× / 1× / 0.4× — favorites show up more often.
- After every rep-based set (circuit or HIIT), the mic listens during rest — say the
  number you actually did and it overrides the auto-count (toggle in settings).
- Settings → DATA → "clear" wipes workout history (two-tap confirm).

## Firebase console — already configured

- Firestore `(default)` database (nam5), rules deployed from `firestore.rules`
- Auth: Google provider enabled (support email egabel@gmail.com)
- AI Logic: Gemini Developer API backend (`gemini-2.5-flash` for the coach line)
- App Check: web app registered with reCAPTCHA Enterprise
  (site key in `src/firebase.js`, domains: dadlift.web.app, dadlift.firebaseapp.com, localhost)
- App Check **enforcement is OFF**. After confirming the deployed app works, turn it on:
  Firebase console → App Check → APIs → enforce for Firestore and AI Logic.
  (Register your local debug token first or local dev will break.)

## Feature parity vs. the original artifact (dadlift.jsx)

- [x] Daily deterministic workout (date seed → mulberry32 → 2 per group, reps from {10,12,15})
- [x] Circuit mode: spoken auto-counter, beeps, auto-advance, DONE override; timed countdowns
- [x] HIIT mode: work/rest intervals, AMRAP reps, fully auto-flowing
- [x] SVG ring timers, ≤3s beeps, voice announcements, exercise/round rest, rounds 1–3
- [x] Two-frame stick figures cross-faded every 850ms (schema unchanged)
- [x] Library: browse / add (LLM prompt + JSON import with validation & dedupe) / export
- [x] Settings steppers (cadence, rests, HIIT intervals, round rest, voice) — persisted, debounced
- [x] History/streak: one entry per day; home shows streak / this week / total
- [x] AI coach line on completion (same prompt, now Gemini via Firebase AI Logic)
- [x] PWA: manifest + service worker, installable; screen wake lock during the player
- [x] NEW: Google sign-in, multi-user allowlist, admin Users screen
- [x] NEW: Stats screen with login + workout charts
