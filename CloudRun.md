#  TravelManager – Cloud Run Deployment (Full Documentation)

##  Architecture Overview

The application is a full-stack, cloud-native travel management system built with Nuxt 3 and deployed on Google Cloud.

It follows a **separation of concerns architecture**:

- Frontend: Vue 3 / Nuxt 3 (SPA + SSR)
- Backend: Nuxt Nitro (server/api REST layer)
- Authentication: Firebase Authentication (OIDC Identity Provider)
- Database: PostgreSQL (Cloud SQL)
- Infrastructure: Terraform (Infrastructure as Code)
- Hosting: Google Cloud Run (PaaS)

---

## System Architecture
            ┌──────────────────────────────┐
            │        Browser (Client)       │
            │   Vue 3 + Nuxt 3 Frontend    │
            └─────────────┬────────────────┘
                          │
                          │ Firebase JWT (Bearer Token)
                          ▼
            ┌──────────────────────────────┐
            │      Google Cloud Run        │
            │  Nuxt 3 + Nitro Server API   │
            │  REST API (/api/trips)       │
            └─────────────┬────────────────┘
                          │
                          │ node-postgres (pg)
                          ▼
            ┌──────────────────────────────┐
            │      Google Cloud SQL        │
            │     PostgreSQL 16            │
            └──────────────────────────────┘


---

## Authentication & Authorization

### Authentication (Identity Provider)

- Firebase Authentication is used as a **standard OIDC-compliant Identity Provider**
- Users authenticate via Firebase (Email/Password login)
- Firebase returns a **JWT token**

### Authentication Flow

1. User logs in via Firebase Auth
2. Firebase issues JWT
3. Frontend sends token with requests:
4. Backend verifies token using Firebase Admin SDK
5. Decoded user is stored in:
    event.context.user

---

### Authorization (Multi-user security)

- Every API request is scoped to the authenticated user
- Backend enforces ownership via:
    user_id = event.context.user.uid
- No frontend-provided `userId` is trusted
- Users can only access their own trips

---

## Cloud Infrastructure

### Google Cloud Services Used

- Cloud Run (PaaS): Runs Nuxt 3 + Nitro server
- Cloud SQL (IaaS): PostgreSQL 16 database
- Cloud Build: Builds Docker images
- Terraform: Infrastructure provisioning (IaC)

---

## Deployment Guide

### 1. Authenticate Google Cloud

```bash
gcloud auth login
gcloud config set project {Project_ID}

gcloud builds submit --tag gcr.io/{Project_ID}/travel-app

gcloud run deploy travel-app \
  --image gcr.io/{Project_ID}/travel-app \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080

```

### 2. Build Docker Image 

```bash
gcloud builds submit --tag gcr.io/{Project_ID}/travel-app
```

### 3. Deploy to CloudRun
```bash
gcloud run deploy travel-app \
  --image gcr.io/{Project_ID}/travel-app \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080
```

### 4. Terraform Infra Deployment 
```bash
cd terraform
terraform init
terraform apply
```

### Env Variables for CloudRun
```bash
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### Build & Run
```bash
npm run build
node .output/server/index.mjs
```

---

## Firebase Setup (required for Auth)

### 1. Create Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → link to the same GCP project as your Cloud Run service.
2. In **Authentication → Sign-in method**, enable:
   - **Email/Password**
   - **Google** (set your project support email)

### 2. Register a web app

1. Firebase Console → Project Settings → **Your apps** → **Add app** → Web.
2. Copy the config object — extract these four values into your `.env` / terraform vars:
   ```
   NUXT_PUBLIC_FIREBASE_API_KEY
   NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NUXT_PUBLIC_FIREBASE_PROJECT_ID
   NUXT_PUBLIC_FIREBASE_APP_ID
   ```

### 3. Authorized domains

Firebase Console → Authentication → Settings → **Authorized domains** → **Add domain**:
- `localhost` (for local dev)
- Your Cloud Run URL, e.g. `your-service-abc123-ew.a.run.app`

### 4. Service account (Admin SDK)

1. Firebase Console → Project Settings → **Service accounts** → **Generate new private key** → download JSON.
2. Minify to one line and store in Secret Manager:
   ```sh
   gcloud secrets create travelmanager-firebase-service-account \
     --data-file=firebase-service-account.json \
     --project=YOUR_PROJECT_ID
   ```
3. Grant the Cloud Run service account access:
   ```sh
   gcloud secrets add-iam-policy-binding travelmanager-firebase-service-account \
     --member="serviceAccount:YOUR_CLOUD_RUN_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

### 5. Deploy

Run `scripts/deploy-cloud-run-paas.sh` — it sets `NUXT_PUBLIC_FIREBASE_*` via `--set-env-vars` and `FIREBASE_SERVICE_ACCOUNT` via Secret Manager mount in `main.tf`.
