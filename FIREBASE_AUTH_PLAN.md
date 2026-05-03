# Firebase Identity Management — Implementation Plan

## Context

Exercise 3 requires identity management with signup/signin outsourced to a provider. Firebase Admin SDK is already referenced in `server/middleware/auth.ts` and deps (`firebase`, `firebase-admin`) are in `package.json`, but the frontend **never actually calls Firebase**. Current reality:

- `app/pages/register.vue` — POSTs email only to `/api/users`. No password, no token.
- `app/composables/useAuth.js` — calls `getAuth()` only if `getApps().length > 0`, but no `initializeApp()` is ever run client-side → Firebase is effectively dead code.
- `server/api/users/index.post.js` — trusts request body, creates user from plain email.
- `server/middleware/auth.ts` — throws 401 only if `FIREBASE_SERVICE_ACCOUNT` env is set; otherwise silently skips token verification.

Goal: real Firebase-backed signup/signin (email+password and Google OAuth), every API call protected by a Firebase JWT, backend scopes all data by `firebase_uid`.

Decisions:
- Providers: **Email+Password + Google OAuth** (both on the signin screen).
- Existing data: **fresh start** — drop `users` and cascade; schema gets `firebase_uid` as the identity column.

---

## Files to create

- `app/plugins/0.firebase.client.js` — call `initializeApp(runtimeConfig.public.firebase)` once. Filename prefix `0.` ensures it runs before `auth.client.js`.
- `app/composables/useApiFetch.js` — wrapper around `$fetch` that attaches `Authorization: Bearer <idToken>` for every `/api/*` call. Pulls token via `getAuth().currentUser.getIdToken()`. Replaces raw `$fetch('/api/...')` across pages.
- `server/api/users/me.get.js` — returns the full profile row for `event.context.user.uid`. Frontend calls this after signin to hydrate display name and avatar.
- `.env.example` additions — Firebase web config keys plus `FIREBASE_SERVICE_ACCOUNT` JSON for the server.

## Files to modify

### Frontend
- `nuxt.config.js` — add `runtimeConfig.public.firebase = { apiKey, authDomain, projectId, appId }` sourced from `NUXT_PUBLIC_FIREBASE_*` env vars at deploy time.
- `app/composables/useAuth.js` — add:
  - `signUpEmail(email, password, name)` → `createUserWithEmailAndPassword` → `updateProfile({ displayName })` → POST `/api/users` with token to create Postgres row.
  - `signInEmail(email, password)` → `signInWithEmailAndPassword`.
  - `signInGoogle()` → `signInWithPopup(new GoogleAuthProvider())` → POST `/api/users` with token (idempotent upsert on first login).
  - Existing `onAuthStateChanged` handler refreshes token and calls `/api/users/me` to hydrate profile; stores unified user in `useState`.
  - Remove localStorage caching of backend fields that can go stale; keep only minimal display fields. Firebase is the session source of truth.
- `app/pages/register.vue` — rewrite as tabbed signin/signup:
  - Tab 1 (Sign in): email + password + “Continue with Google” button.
  - Tab 2 (Sign up): name + email + password + “Continue with Google” button.
  - On success → `navigateTo('/trips')`.
  - Error handling maps Firebase error codes to user-facing messages.
- `app/app.vue` — existing logout button already calls `useAuth().logout()`; verify it runs `signOut(auth)` and clears state (it does; keep).
- All pages that call `$fetch('/api/...')` — switch to `useApiFetch`. Audit list: `trips/index.vue`, `trips/new.vue`, `trips/[id].vue`, `profile.vue`, `community.vue`, `explore.vue`, `plan/[tripId].vue`, `plan-view/[tripId].vue`, components `TripForm.vue`, `LocationManager.vue`.

### Backend
- `server/utils/db.js` — schema change:
  - Drop existing `users` (fresh start). Re-create with:
    ```
    firebase_uid TEXT PRIMARY KEY
    email        TEXT NOT NULL UNIQUE
    name         TEXT NOT NULL
    bio          TEXT NOT NULL DEFAULT ''
    home_city    TEXT NOT NULL DEFAULT ''
    avatar_url   TEXT NOT NULL DEFAULT ''
    created_at   TIMESTAMPTZ DEFAULT NOW()
    ```
  - `trips.user_id INTEGER` → `trips.user_uid TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE`. Same change for `reviews.reviewer_id`.
  - Recreate `plan_locations`, `reviews`, `travel_plans` so FK types line up. Other tables unchanged.
- `server/middleware/auth.ts` — remove the “skip if unset” branch. If `FIREBASE_SERVICE_ACCOUNT` is missing in production → fail startup (throw at module load). Allow skip only when `NODE_ENV !== 'production'` and an explicit `SKIP_AUTH=1` flag is set. Add a route allowlist: verification is skipped only for genuinely public GETs (`/api/trips/all` for the guest-search story, `/api/destinations*`). All other routes require a valid token.
- `server/api/users/index.post.js` — rewrite:
  - Must have `event.context.user` (Firebase UID + email from token).
  - Upsert by `firebase_uid`. Accept `name` from body only on first create; ignore on subsequent calls.
  - Never trust email from body — use `event.context.user.email`.
- `server/api/users/[id].get.js|put.js|patch.js` — route param becomes `firebase_uid` (TEXT) instead of numeric id. Authorize: a user can only `PUT`/`PATCH` their own record (`params.id === context.user.uid`). Public GET of other profiles stays allowed (for showing trip authors).
- All `server/api/trips/*`, `server/api/locations/*`, `server/api/reviews/*`, `server/api/travel-plans/*` handlers — replace every `userId` from query/body with `event.context.user.uid`. Remove any client-supplied userId entirely. Verify ownership before PUT/DELETE.
- `server/api/trips/all.get.js` — stays public (guest search story).

### Config / deploy
- `terraform/main.tf` + `terraform.tfvars.example` — add Cloud Run env vars:
  - `FIREBASE_SERVICE_ACCOUNT` (from Secret Manager).
  - `NUXT_PUBLIC_FIREBASE_API_KEY`, `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NUXT_PUBLIC_FIREBASE_PROJECT_ID`, `NUXT_PUBLIC_FIREBASE_APP_ID`.
- `scripts/deploy-cloud-run-paas.sh` — pass the four public vars through `gcloud run deploy --set-env-vars`. Service account already mounted via secret.
- `CloudRun.md` / `DEPLOYMENT_GOOGLE_CLOUD.md` — append Firebase console setup:
  - Create Firebase project linked to the GCP project.
  - Enable Email/Password + Google Sign-In providers.
  - Add Cloud Run URL and `localhost` to authorized domains.
  - Download service-account JSON → store in Secret Manager as `FIREBASE_SERVICE_ACCOUNT`.

---

## Verification

1. **Local Docker run** with a dev Firebase project:
   - `docker compose up --build`.
   - Open `http://localhost:3000` → redirect to `/register`.
   - Sign up via email+password → Postgres row created, redirect to `/trips`, DevTools network tab shows `Authorization: Bearer ey…` on `/api/trips`.
   - Logout, sign in again with same credentials → works.
   - “Continue with Google” → popup → consent → first-login inserts Postgres row; subsequent logins reuse it.
2. **Token scoping / authorization**:
   - Sign in as user A, create a trip.
   - Sign in as user B in incognito. `GET /api/trips` returns only B’s trips. Attempting `PUT /api/trips/<A’s id>` returns 403.
   - With `Authorization` header stripped, any write returns 401.
3. **Guest path**:
   - Log out entirely. `/community` + `/explore` still load (public GETs). Search result list renders.
4. **Cloud Run deploy** via `scripts/deploy-cloud-run-paas.sh`:
   - Repeat checks 1 and 2 against the deployed URL.
   - `gcloud run services describe travel-app` lists all required env vars.
5. **Code sanity**:
   - `grep -rn "userId" server/api` returns nothing — all replaced by `context.user.uid`.