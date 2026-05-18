# Implementation Documentation

## Overview

This document describes the implementation of five user stories added to the **One Cloud Away** travel planning application, including the technology decisions, architecture changes, and setup instructions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Nuxt 3 (Vue 3 Composition API) |
| Backend | Nitro (Nuxt server framework) |
| Relational Database | PostgreSQL 16 (Google Cloud SQL) |
| NoSQL Database | Firebase Firestore |
| Object Storage | Firebase Storage |
| Identity Management | Firebase Authentication |
| Deployment | Docker + Google Cloud Run |
| Infrastructure | Terraform |

---

## User Stories Implemented

### 1. Add Travel Locations with Date Range

**Story:** As a traveller I can add locations to a trip. The location has a date range (from, to), a name, a short description, and images.

**Implementation:**

- Added `date_from DATE` and `date_to DATE` columns to the `plan_locations` PostgreSQL table
- Updated REST API endpoints:
  - `GET /api/locations/trip/:tripId` — returns date fields
  - `POST /api/locations/trip/:tripId` — accepts `date_from`, `date_to`
  - `PUT /api/locations/:id` — accepts `date_from`, `date_to`
- Updated `LocationManager.vue` component:
  - Date range inputs (from / to) with client-side validation (to ≥ from)
  - Date displayed on each location card

**Files changed:**
- `server/utils/db.js` — schema
- `server/api/locations/trip/[tripId].get.js`
- `server/api/locations/trip/[tripId].post.js`
- `server/api/locations/[id].put.js`
- `app/components/LocationManager.vue`

---

### 2. Object Storage for Images (Firebase Storage)

**Story:** Location images and profile avatars are stored in Firebase Storage instead of the database (base64).

**Decision:** Firebase Storage was chosen because Firebase Auth is already integrated into the project. No additional SDK dependency is needed — `firebase` v12 includes the Storage SDK. Images are uploaded directly from the browser using the Firebase client SDK with the user's auth token, keeping uploads off the server.

**Implementation:**

- Added `storageBucket` to the Firebase client config (`nuxt.config.js`)
- Created `app/composables/useImageUpload.js` — shared upload helper using `uploadBytes` + `getDownloadURL`
- **Profile avatar** (`app/pages/profile.vue`):
  - Image is compressed to max 320px JPEG via Canvas API → uploaded to `avatars/{uid}/{timestamp}.jpg`
  - Old avatar deleted from Storage on removal
  - PATCH endpoint (`server/api/users/[id].patch.js`) now validates HTTPS URL instead of checking base64 size
- **Location images** (`app/components/LocationManager.vue`):
  - Image compressed to max 1400px JPEG → uploaded to `locations/{tripId}/{timestamp}.jpg`
  - External URL paste still supported (bypasses Storage)

**Firebase Storage Security Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Files changed:**
- `nuxt.config.js`
- `.env.example`
- `app/composables/useImageUpload.js` (new)
- `app/pages/profile.vue`
- `app/components/LocationManager.vue`
- `server/api/users/[id].patch.js`

---

### 3. Likes and Comments (Firebase Firestore)

**Story:** As a traveller I can like (only once) the trip of another traveller and optionally add a comment. The trip page shows the like count and expandable comments.

**Decision:** Firebase Firestore was chosen as the NoSQL store for likes/comments. Firestore naturally models the one-like-per-user constraint as a document keyed by `userId`. All Firestore access goes through the Nitro server using the Firebase Admin SDK, which bypasses client-side security rules entirely — the server enforces auth.

**Data Model:**
```
likes/
  {tripId}/
    users/
      {userId}/
        comment: string
        userName: string
        createdAt: Timestamp
```

**API Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/likes/trip/:tripId` | Public | Returns count, comments, likedUserIds |
| POST | `/api/likes/trip/:tripId` | Required | Add like (+ optional comment) |
| DELETE | `/api/likes/trip/:tripId` | Required | Remove like |

**UI** (`app/pages/trips/[id].vue`):
- Heart button with like count (toggles liked/unliked state)
- Comment input shown before liking (optional, max 200 chars)
- Expandable comments list

**Firestore Security Rules** (deny all — access is server-side only):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Files changed:**
- `server/middleware/auth.ts` — whitelist GET `/api/likes/trip/:tripId`
- `server/api/likes/trip/[tripId].get.js` (new)
- `server/api/likes/trip/[tripId].post.js` (new)
- `server/api/likes/trip/[tripId].delete.js` (new)
- `app/pages/trips/[id].vue`

---

### 4. Identity Management — Route Guards & Profile Setup

**Story:** Sign up / sign in is integrated into the application with route protection and a profile setup flow for new users.

**Implementation:**

- **Firebase Auth** was already integrated (email/password + Google Sign-In). This story adds:

- **Global route middleware** (`app/middleware/auth.global.js`):
  - Runs on every client-side navigation
  - Protects `/trips`, `/profile`, `/plan` — redirects unauthenticated users to `/register`
  - If authenticated user has no name set → redirects to `/profile?setup=1`
  - Waits for `authReady` flag before checking (avoids false redirects during Firebase hydration)

- **`authReady` state** added to `useAuth.js`:
  - Set to `true` after `onAuthStateChanged` fires for the first time
  - Prevents the middleware from redirecting logged-in users whose auth state hasn't loaded yet

- **Profile setup flow**:
  - After Google sign-in, if user has no name → redirected to `/profile?setup=1`
  - Profile page shows a welcome banner when `?setup=1` query param is present

**Files changed:**
- `app/middleware/auth.global.js` (new)
- `app/composables/useAuth.js`
- `app/pages/register.vue`
- `app/pages/profile.vue`

---

### 5. Search Trips

**Story:** As a guest or traveller I can search for itineraries of other travellers.

**Implementation:**

- `GET /api/trips/all` extended with `?q=` query parameter
  - PostgreSQL `ILIKE` search across `title`, `destination`, `short_description`
  - Parameterised query (no SQL injection risk)
  - Endpoint remains public (already whitelisted in auth middleware)

- Community page (`app/pages/community.vue`):
  - Search bar with 350ms debounce
  - Results fetched server-side with each search
  - Guests can now access the community page (auth gate removed)
  - Contextual empty state: "No trips match '…'" vs "No trips yet"

**Files changed:**
- `server/api/trips/all.get.js`
- `app/pages/community.vue`

---

## Firebase Console Setup

Before deploying, the following must be configured in the [Firebase Console](https://console.firebase.google.com):

### 1. Firestore Database
1. Firestore Database → **Create database**
2. Select **Production mode**
3. Choose region (e.g. `europe-west1`)
4. Note the database name (used in server API calls)

### 2. Firebase Storage
1. Storage → **Get started**
2. Select **Production mode**, same region as Firestore
3. Go to **Rules** tab and publish the authenticated-write rules (see above)
4. Copy the bucket name (e.g. `project-id.firebasestorage.app`) → set as `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`

### 3. Authentication — Authorized Domains
After deployment, add the Cloud Run URL to Firebase Auth authorized domains:
- Authentication → Settings → **Authorized domains** → Add domain

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NUXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NUXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase / GCP project ID |
| `NUXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |
| `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID (for Firestore Admin SDK) |

---

## Local Development

```bash
# Copy and fill environment variables
cp .env.example .env

# Start all services (PostgreSQL + Nginx + App)
docker compose up --build
```

App runs at `http://localhost` (port 80 via Nginx).

---

## Cloud Run Deployment

Infrastructure is managed with Terraform. A deploy script handles the full pipeline.

**Prerequisites:**
- `gcloud`, `docker`, `terraform` installed
- Logged in: `gcloud auth login` and `gcloud auth application-default login`

**Steps:**

```bash
# 1. Create tfvars from example
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform/terraform.tfvars with real values

# 2. Run deploy
bash scripts/deploy-cloud-run-paas.sh
```

The script:
1. Initialises and validates Terraform
2. Creates Artifact Registry repository
3. Builds and pushes Docker image (`linux/amd64`) to Artifact Registry
4. Applies full Terraform infrastructure (Cloud SQL, Cloud Run, IAM, Secret Manager)
5. Forces a Cloud Run rollout with all environment variables

**IAM roles granted to Cloud Run service account by Terraform:**
- `roles/cloudsql.client` — PostgreSQL via Cloud SQL proxy
- `roles/datastore.user` — Firestore read/write
- `roles/secretmanager.secretAccessor` — DATABASE_URL secret

Firebase Admin SDK on Cloud Run uses **Application Default Credentials** (the attached service account) — no service account JSON key required.
