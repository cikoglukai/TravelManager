# TravelManager — Presentation Source (20 slides)

> Source-of-truth document for a Gamma deck on the TravelManager application: architecture, build, dual deployment (IaaS on Compute Engine + PaaS on Cloud Run), Firebase auth, Terraform IaC, load testing.
>
> Each `## Slide N` heading = one slide. Compact form: many topics merged per slide to fit 20-slide cap without losing technical substance.

---

## Slide 1 — Title & Agenda

**TravelManager — Cloud-Native Trip Planning Platform**
Nuxt 3 + PostgreSQL + Firebase, deployed twice on Google Cloud (IaaS + PaaS), provisioned with Terraform, load-tested with Locust.

*Repo:* github.com/cikoglukai/TravelManager

**Agenda**
1. Problem & user stories  2. Tech stack  3. Architecture  4. Frontend (Nuxt)  5. Backend (Nitro)  6. Database  7. Authentication  8. Storage & Firestore  9. Docker + Nginx + TLS  10. IaaS deploy  11. PaaS deploy  12. Terraform — APIs, AR, Cloud SQL  13. Terraform — Secrets, IAM, Cloud Run  14. Deploy script  15. Env vars & local dev  16. Load testing  17. IaaS vs PaaS comparison  18. Security & cost  19. Lessons + next steps  20. Demo + Q&A

---

## Slide 2 — Problem, user stories, tech stack

**Problem.** Travelers want lightweight tool for multi-stop trips with date ranges + public sharing. Existing options too heavy (booking platforms) or too light (notes apps).

**User stories implemented** (source: `IMPLEMENTATION.md`)

| # | Story |
|---|-------|
| 1 | Plan trip with multiple locations, each with date range |
| 2 | Upload trip cover + avatar images |
| 3 | Like and comment on public trips |
| 4 | Identity / profile (name, bio, home city) |
| 5 | Search public trips by title/destination/description |

**Tech stack**

| Layer | Choice |
|-------|--------|
| Frontend | Nuxt 3, Vue 3 Composition API |
| Server | Nitro (Nuxt SSR runtime), Node 22 (`^20.19.0 \|\| >=22.12.0`) |
| Relational DB | PostgreSQL 16 (driver: `pg`) |
| Auth | Firebase Authentication (OIDC) + `firebase-admin` |
| Object storage | Firebase Storage (images) |
| NoSQL | Cloud Firestore (likes / comments) |
| 3D viz | globe.gl (Three.js) |
| Container | Docker, `node:22-alpine` |
| Reverse proxy / TLS | Nginx 1.27 + Let's Encrypt (IaaS only) |
| IaC | Terraform `~> 5.0` Google provider |
| Load test | Locust (Python) |

---

## Slide 3 — Logical architecture & repo layout

```
┌────────────┐  Firebase JWT  ┌──────────────────────┐
│  Browser   │ ──────────────▶│  Nuxt 3 / Nitro app  │
│  (Vue 3)   │ ◀── HTML/JSON ─│   (Node 22, :8080)   │
└─────┬──────┘                └─────┬──────────┬─────┘
      │ Firebase SDK                │ pg       │ firebase-admin
      ▼                             ▼          ▼
┌────────────┐               ┌───────────┐  ┌──────────────┐
│  Firebase  │               │ Postgres  │  │  Firestore   │
│ Auth+Stor. │               │    16     │  │ likes/comm.  │
└────────────┘               └───────────┘  └──────────────┘
```

Same image, two realizations:
- **IaaS:** GCE/Azure VM → Nginx → app → Postgres (all in Docker Compose)
- **PaaS:** Cloud Run (image from Artifact Registry) → Cloud SQL via Unix socket

```
TravelManager/
├─ app/        # Nuxt frontend (pages, components, composables, plugins, middleware)
├─ server/     # Nitro backend (api, middleware/auth.ts, plugins/db.js, utils/db.js, utils/seed.js)
├─ nginx/      # default.conf, https.conf.template, 99-enable-https.sh
├─ terraform/  # main.tf, variables.tf, outputs.tf, terraform.tfvars
├─ scripts/    # deploy-cloud-run-paas.sh
├─ tests/load/ # Locust scenarios (browsing.py, authenticated.py)
├─ Dockerfile, docker-compose.yml, docker-compose.override.yml
└─ DEPLOYMENT_*.md, CloudRun.md, SETUP.md, README.md, LOCUST_SETUP.md
```

---

## Slide 4 — Frontend: pages, composables, guards

**File-based routing**

| Route | Auth | Function |
|-------|------|----------|
| `/` | — | Redirect to trips or register |
| `/register` | public | Email+pw + Google OAuth (tabbed) |
| `/profile` | yes | Name, bio, home city, avatar upload |
| `/trips` | yes | Own trips grid |
| `/trips/new` | yes | Create form |
| `/trips/[id]` | yes | Detail, inline edit, comments |
| `/community` | public | All public trips (filterable) |
| `/explore` | public | 3D globe destination explorer |
| `/plan/[tripId]` | yes | Multi-location editor |
| `/plan-view/[tripId]` | public | Read-only plan |

**Composables** (`app/composables/`)
- `useAuth.js` — `signUpEmail / signInEmail / signInGoogle / logout`; listens `onAuthStateChanged` → hydrates from `/api/users/me`
- `useApiFetch.js` — `$fetch` wrapper, calls `getIdToken()` → injects `Authorization: Bearer <jwt>` on every request
- `useImageUpload.js` — Firebase Storage upload, JPEG-compressed; paths `avatars/{uid}/{ts}.jpg`, `locations/{tripId}/{ts}.jpg`

**Guards & init**
- `app/plugins/0.firebase.client.js` — Firebase SDK init runs first (filename prefix `0.` enforces order)
- `app/middleware/auth.global.js` — protects `/trips/*`, `/profile*`, `/plan*`; unauthed → `/register`; logged-in user without `name` → `/profile?setup=1`

---

## Slide 5 — Backend: route map, middleware, authz

**API routes** (`server/api/`)
```
users/         POST · GET /me · GET/PUT/PATCH /[id]
trips/         GET (own) · POST · GET/PUT/DELETE /[id] · GET /all (public + ?q=)
locations/     GET/POST /trip/[tripId] · PUT/DELETE /[id]
likes/         GET/POST/DELETE /trip/[tripId]      (Firestore)
reviews/       GET/POST /trip/[tripId] · DELETE /[id]
travel-plans/  GET/POST/DELETE /[tripId]
destinations/  GET · GET /[id]/routes
```
Public whitelist: `GET /api/trips/all`, `GET /api/destinations*`, `GET /api/likes/trip/*`. All others require Firebase JWT.

**Auth middleware** (`server/middleware/auth.ts`)
1. Skip non-API paths  2. Skip whitelisted public paths  3. Extract `Authorization: Bearer <token>`  4. `firebase-admin.auth().verifyIdToken(token)`  5. Store `event.context.user = { uid, email, name, ... }`  6. Failure → 401.
Admin SDK credential order: `FIREBASE_SERVICE_ACCOUNT` env (JSON) → ADC (gcloud / Cloud Run runtime SA). Dev escape: `SKIP_AUTH=1` (non-prod).

**Authorization model.** `event.context.user.uid` is the *only* trusted identity. All ownership checks use it: `WHERE user_uid = $1`. Cross-user write → 403.

```js
// POST /api/trips
const user = event.context.user
if (!user?.uid) throw createError({ statusCode: 401 })
const body = await readBody(event)
await db.query(
  'INSERT INTO trips (user_uid, title, ...) VALUES ($1, $2, ...) RETURNING *',
  [user.uid, body.title, ...]
)
```

---

## Slide 6 — Database: schema (Postgres 16)

`server/utils/db.js` exposes singleton `pg.Pool` via `getDb()`. Local: `postgresql://postgres:postgres@postgres:5432/travelmanager`. Cloud Run → Cloud SQL (Unix socket): `postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE`. `initDb()` runs in Nitro plugin (`server/plugins/db.js`) — drops + recreates user data tables on cold boot, seeds reference tables idempotently.

**Core tables** (`ON DELETE CASCADE`)
```sql
users (firebase_uid PK, email UNIQUE, name, bio, home_city, avatar_url, created_at)
trips (id PK, user_uid → users, title, destination, start_date,
       short_description, detail_description, created_at)
plan_locations (id PK, trip_id → trips, name, description, image_url,
                date_from, date_to, position, created_at)
reviews (id PK, trip_id → trips, reviewer_id → users,
         stars CHECK 1..5, comment, UNIQUE(trip_id, reviewer_id))
```

**Reference tables** (seeded once from `server/utils/seed.js` — 15 European cities, 3–5 routes each, transport + accommodation options)
```sql
destinations          (id, country, city, emoji, description)
routes                (id, destination_id, name, duration_days, highlights)
transport_options     (id, route_id, type, provider, duration, price_from, notes)
accommodation_options (id, route_id, type, name, price_per_night, rating, notes)
travel_plans          (id, trip_id UNIQUE, destination_id, route_id,
                       transport_option_id, accommodation_option_id, notes)
```

---

## Slide 7 — Authentication: signup, OAuth, server verify

**Signup (email+pw)**
```
register.vue → useAuth.signUpEmail(email, pw, name)
  → createUserWithEmailAndPassword()         // Firebase
  → updateProfile({ displayName })
  → getIdToken()
  → POST /api/users  (Bearer <jwt>, body { name })
       → middleware: verifyIdToken
       → INSERT INTO users ON CONFLICT DO UPDATE     // idempotent upsert
       → redirect /trips
```

**Google OAuth**
```
useAuth.signInGoogle()
  → signInWithPopup(GoogleAuthProvider())
  → onAuthStateChanged fires
  → POST /api/users (idempotent upsert)
  → GET  /api/users/me (hydrate state)
  → redirect /trips (or /profile?setup=1 when name missing)
```
Authorized domains in Firebase console: `localhost`, Cloud Run URL, `onecloudaway.de`.

**Per-request server verification**
```
Browser ──Authorization: Bearer <jwt>──▶ Cloud Run / VM
  → auth.ts middleware
    → verifyIdToken(jwt)
       ├─ ok  → event.context.user = { uid, email, name }
       └─ bad → 401
```
Idempotent upsert means signup retry safe. `event.context.user.uid` is gospel — frontend never supplies trusted user IDs.

---

## Slide 8 — Firebase Storage & Firestore

**Storage (images).** Client uploads via `useImageUpload`, JPEG-compressed before send. Paths: `avatars/{uid}/{timestamp}.jpg`, `locations/{tripId}/{timestamp}.jpg`. Returned download URL persisted in Postgres (`users.avatar_url`, `plan_locations.image_url`). Bucket from `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

**Firestore (likes & comments).** One document per `(tripId, uid)` → guarantees one-like-per-user without DB locking. Comments stored alongside the like. Public read of like count without auth (no Postgres pressure). Server uses `firebase-admin` Firestore client; Cloud Run SA holds `roles/datastore.user`.

**Why Firestore here?** High write fan-out, simple counter pattern, public read scaling. Postgres handles relational integrity (trips, locations, reviews); Firestore handles the social signal layer.

---

## Slide 9 — Containerization, Nginx, TLS

**Dockerfile** (single-stage, `node:22-alpine`, output `.output/server/index.mjs`)
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=8080
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
```

**docker-compose.yml** (IaaS path)
```yaml
nginx:    nginx:1.27-alpine        # 80, 443 → app:8080
postgres: postgres:16-alpine       # 127.0.0.1:5433 → 5432, healthcheck pg_isready
app:      build: .                 # 127.0.0.1:3000 → 8080, depends_on postgres
```
`app` reads `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/travelmanager`. `restart: unless-stopped`. Volumes `certbot_www` + `letsencrypt` mounted into `nginx`.

**Nginx (`nginx/default.conf`).** Default `:80` → `proxy_pass http://app:8080`. Domain server block serves ACME challenge at `/.well-known/acme-challenge/`, 301-redirects everything else to HTTPS. `nginx/https.conf.template` activated by `99-enable-https.sh` once cert files exist.

**Let's Encrypt via Certbot**
```bash
docker compose --profile certbot run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email you@example.com --agree-tos --no-eff-email \
  -d onecloudaway.de -d www.onecloudaway.de
docker compose exec nginx sh /docker-entrypoint.d/99-enable-https.sh
docker compose exec nginx nginx -s reload
# renewal:
docker compose --profile certbot run --rm certbot renew \
  --webroot --webroot-path /var/www/certbot
docker compose exec nginx nginx -s reload
```

---

## Slide 10 — Deployment A — IaaS on Compute Engine VM

**Target.** Single GCE / Azure VM running Docker Compose. `[Internet] → [VM:443] → Nginx → app:8080 → postgres:5432`. We own OS patches, Docker upgrades, Postgres data volume, TLS renewal, firewall, image snapshots, scaling.

**VM bootstrap** (Ubuntu 24.04 LTS, e2-medium / D2s v3)
```bash
sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y \
  docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker
```
Firewall: 22 (SSH, restricted source), 80, 443.

**Deploy + smoke test**
```bash
git clone https://github.com/cikoglukai/TravelManager.git
cd TravelManager
cp .env.example .env       # fill Firebase + DATABASE_URL
docker compose up -d --build
docker compose ps          # all "running"
```
Smoke: open `http://<public-ip>` → register → create trip → reload (persists) → edit + delete → issue cert → enable HTTPS → re-test. Snapshot VM disk → reusable Managed Image.

---

## Slide 11 — Deployment B — PaaS on Cloud Run + Cloud SQL

**Target.** Cloud Run (auto-scale 0..3) + Cloud SQL (Postgres 16). `[Internet] ──HTTPS──▶ Cloud Run ──/cloudsql/<conn> Unix socket──▶ Cloud SQL`. Google owns TLS, autoscaling, OS, runtime patches, DB backups. We own image, Terraform config, Firebase setup.

**Cloud Run runtime contract.** Container must (1) listen on `0.0.0.0:$PORT` (default `8080`), (2) be stateless (no local disk persistence between requests), (3) start fast (cold-start matters because `min_instances = 0`). Our app already satisfies all three.

**Cloud SQL connectivity.** Cloud Run mounts the SQL instance as a volume:
```hcl
volumes      { name = "cloudsql"  cloud_sql_instance { instances = [<conn>] } }
volume_mounts{ name = "cloudsql"  mount_path = "/cloudsql" }
```
Resulting connection string (Unix socket, no public IP on the DB):
```
postgresql://travelmanager:<urlencoded-pw>@/travelmanager
  ?host=/cloudsql/<PROJECT>:<REGION>:<INSTANCE>
```
SA `roles/cloudsql.client` is the only thing that can dial in.

---

## Slide 12 — Terraform: APIs, Artifact Registry, Cloud SQL

`terraform/{main.tf, variables.tf, outputs.tf, terraform.tfvars}`. Provider `hashicorp/google ~> 5.0`, Terraform `>= 1.5.0`.

**APIs enabled** (`google_project_service.required`, `disable_on_destroy = false`)
```
artifactregistry.googleapis.com
iam.googleapis.com
run.googleapis.com
secretmanager.googleapis.com
sqladmin.googleapis.com
```

**Artifact Registry**
```hcl
resource "google_artifact_registry_repository" "docker" {
  location      = var.region          # europe-west6
  repository_id = "travelmanager"
  format        = "DOCKER"
}
locals {
  image_uri = "${region}-docker.pkg.dev/${project_id}/travelmanager/${image_name}:${image_tag}"
}
```

**Cloud SQL (Postgres 16)**
```hcl
resource "google_sql_database_instance" "postgres" {
  name             = "travelmanager-postgres"
  database_version = "POSTGRES_16"
  region           = var.region
  deletion_protection = var.cloud_sql_deletion_protection
  settings {
    tier              = "db-f1-micro"      # default; tunable
    disk_size         = 10
    availability_type = "ZONAL"            # flip "REGIONAL" for HA
    backup_configuration { enabled = true }
  }
}
resource "google_sql_database" "app" { name = "travelmanager" }
resource "google_sql_user"     "app" { name = "travelmanager"  password = var.db_password }
```

---

## Slide 13 — Terraform: Secret Manager, IAM, Cloud Run service

**Secret Manager — DATABASE_URL never in image / git**
```hcl
locals {
  database_url = "postgresql://${var.db_user}:${urlencode(var.db_password)}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
}
resource "google_secret_manager_secret"         "database_url" { secret_id = "travelmanager-database-url"  replication { auto {} } }
resource "google_secret_manager_secret_version" "database_url" { secret = ...  secret_data = local.database_url }
```

**Service account + IAM**
```hcl
resource "google_service_account" "cloud_run" { account_id = "travelmanager-run" }
```
| Role | Why |
|------|-----|
| `roles/cloudsql.client` | open `/cloudsql/<conn>` socket |
| `roles/datastore.user` | Firestore (likes) |
| `roles/secretmanager.secretAccessor` | read DATABASE_URL secret |

**Cloud Run service**
```hcl
resource "google_cloud_run_v2_service" "app" {
  name = "travelmanager"  location = var.region  ingress = "INGRESS_TRAFFIC_ALL"
  template {
    service_account = google_service_account.cloud_run.email
    scaling { min_instance_count = 0  max_instance_count = 3 }
    containers {
      image = local.image_uri
      ports { container_port = 8080 }
      env { name = "DATABASE_URL"  value_source { secret_key_ref { secret = ... version = "latest" } } }
      env { name = "NUXT_PUBLIC_FIREBASE_API_KEY"        value = var.firebase_api_key }
      env { name = "NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN"    value = var.firebase_auth_domain }
      env { name = "NUXT_PUBLIC_FIREBASE_PROJECT_ID"     value = var.firebase_project_id }
      env { name = "NUXT_PUBLIC_FIREBASE_APP_ID"         value = var.firebase_app_id }
      env { name = "NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET" value = var.firebase_storage_bucket }
      env { name = "GOOGLE_CLOUD_PROJECT"                value = var.firebase_project_id }
      volume_mounts { name = "cloudsql" mount_path = "/cloudsql" }
    }
    volumes { cloud_sql_instance { instances = [<conn>] } }
  }
}
resource "google_cloud_run_v2_service_iam_member" "public" {
  role = "roles/run.invoker"  member = "allUsers"
}
```

**Selected variables** — `project_id` (req), `region` (`europe-west6`), `cloud_sql_tier` (`db-f1-micro`), `cloud_run_min_instances` (0), `cloud_run_max_instances` (3), `db_password` (sensitive), `image_tag` (`latest`), `firebase_*` (web config). **Outputs** — `image_uri`, `cloud_run_url`, `db_connection_name`, `database_url_secret_id`.

---

## Slide 14 — Deploy script & redeploy flow

**`scripts/deploy-cloud-run-paas.sh` — one-command PaaS deploy**
```bash
./scripts/deploy-cloud-run-paas.sh
# overrides:
PROJECT_ID=... REGION=... IMAGE_TAG=v3 AUTO_APPROVE=1 \
  ./scripts/deploy-cloud-run-paas.sh
```
Steps:
1. Read `terraform/terraform.tfvars`
2. `terraform init / fmt / validate`
3. `terraform apply -target=google_artifact_registry_repository.docker` (bootstrap AR before image push)
4. `gcloud auth configure-docker $REGION-docker.pkg.dev`
5. `docker buildx build --platform linux/amd64 -t $IMAGE_URI --push .`
6. `terraform apply` (Cloud SQL, Secret Mgr, IAM, Cloud Run)
7. Force Cloud Run new revision with `image_tag`
8. Print `cloud_run_url`

**Why `--platform linux/amd64`?** Build host = Apple Silicon (`arm64`). Cloud Run runs `amd64`. Without explicit flag, image lands as `arm64` and Cloud Run rejects at boot.

**Redeploy after code change.** Edit code → bump `image_tag` in tfvars (`v1 → v2`) → run script → Cloud Run rolls new revision → traffic = 100% to new revision. Rollback = redeploy with prior tag (Cloud Run keeps revisions addressable).

---

## Slide 15 — Env vars & local dev

**Env var matrix**

| Var | Local | Docker Compose | Cloud Run |
|---|---|---|---|
| `DATABASE_URL` | localhost:5433 | `postgres:5432` | Secret ref |
| `NUXT_PUBLIC_FIREBASE_*` | `.env` | `.env` | tfvars |
| `GOOGLE_CLOUD_PROJECT` | `.env` | `.env` | tfvars |
| `FIREBASE_SERVICE_ACCOUNT` | optional (ADC) | optional (mounted) | not needed (runtime SA) |
| `NODE_ENV` | development | production | production |
| `NITRO_HOST` | default | `0.0.0.0` | `0.0.0.0` |
| `NITRO_PORT` | 3000 | 8080 | 8080 |

**Local dev with GCP integration.** `docker-compose.override.yml` mounts the developer's gcloud Application Default Credentials → local container speaks to Firestore + Firebase Admin without service account JSON. Required because Admin SDK falls back to ADC if `FIREBASE_SERVICE_ACCOUNT` not set. Activate: `gcloud auth application-default login`. Override file is local-only; production stacks do not load it.

**Local-dev flow.** Firebase console → enable Email/Password + Google → add `localhost` to Authorized Domains → copy web config into `.env` (from `.env.example`). Then `gcloud auth application-default login` → `docker compose up --build` → http://localhost:3000.

---

## Slide 16 — Load testing with Locust

**Layout** (`tests/load/`)
```
locustfile.py            # registers user classes
auth.py                  # Firebase REST signin → JWT cache
seed_users.py            # creates loadtest-NNNN@travelmanager.test users
run_compare.sh           # same scenario vs LOCAL / CLOUD_RUN / GCE
scenarios/browsing.py    # BrowsingUser  (anonymous reads)
scenarios/authenticated.py # AuthedUser  (full CRUD)
requirements.txt, .env(.example)
```
Setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`. Seed: `python seed_users.py` (50 users). Cleanup: `python seed_users.py --cleanup`.

**Virtual-user mix** (75/25 read-vs-write split)

| Class | Weight | Auth | Tasks |
|-------|--------|------|-------|
| `BrowsingUser` | 3 | none | `GET /api/trips/all` (+ `?q=`), destinations, routes, like-count reads |
| `AuthedUser`   | 1 | Firebase JWT | profile upsert, list/create/edit/delete trips, like + comment, review |

Wait time: exponential, mean 5 s (browse) / 3 s (authed). `AuthedUser.on_start` signs in via Firebase REST, caches JWT, refreshes periodically.

**Run profiles & headless reports**

| Profile | Users | Spawn | Time | Use |
|---------|-------|-------|------|-----|
| Smoke | 10 | 2/s | 1 m | sanity |
| Baseline | 50 | 5/s | 5 m | normal |
| Stress | 200 | 20/s | 10 m | overload + cold-start |
| Spike | 500 | 100/s | 2 m | burst capacity |

```bash
locust -f locustfile.py --host https://<cloud-run-url> \
  --users 100 --spawn-rate 10 --run-time 5m \
  --headless --html reports/run.html --csv reports/run

./run_compare.sh 50 5 3m   # iterates LOCAL, CLOUD_RUN, GCE from .env
```
Comparison axes: p50/p95/p99 latency, error rate, Cloud Run cold-start visibility, DB saturation point on IaaS Postgres container vs Cloud SQL `db-f1-micro`.

---

## Slide 17 — IaaS vs PaaS — operational comparison

| Aspect | IaaS (GCE VM + Compose) | PaaS (Cloud Run + Cloud SQL) |
|--------|-------------------------|------------------------------|
| Provisioning | Manual + image snapshot | Terraform end-to-end |
| Scaling | Vertical (resize VM) | Auto (0 → max_instances) |
| TLS | Certbot, manual renewal | Managed by platform |
| OS patching | Ours | Google's |
| DB | Postgres in Docker volume | Managed Cloud SQL + backups |
| Cost when idle | VM keeps running | Scale-to-zero |
| Cold start | None | ~1–2 s on first request |
| Failure domain | Single VM | Regional managed services |
| Time to deploy | ~5 min (manual) | ~3 min (script) |
| Network | Public IP + Nginx | Managed HTTPS, no public DB IP |
| Data plane | Persistent volume | Stateless containers + Cloud SQL |
| Observability | Self-managed | Cloud Logging built-in |

**Verdict.** PaaS wins for spiky / low traffic + ops simplicity. IaaS wins under steady high load if Cloud Run vCPU-seconds would otherwise exceed VM cost; also wins when ops control matters (custom kernel, pinned versions, sidecars).

---

## Slide 18 — Security & cost

**Security model**
- Frontend never sees a user ID it didn't get from Firebase
- Server trusts only `event.context.user.uid` after `verifyIdToken`
- Public endpoints whitelisted explicitly in `auth.ts`
- DB user = least privilege (only own DB, not superuser)
- Secrets in Secret Manager, not in image, not in code, not in git
- VM SSH restricted by source IP
- Cloud SQL has no public IP (Unix socket only)
- Firebase Admin via runtime SA on Cloud Run (no JSON to leak)

**Cost shape (rough order of magnitude)**

| Item | IaaS | PaaS |
|------|------|------|
| Compute | VM 24/7 (~$25 / mo e2-medium) | Per-request (free tier covers low traffic) |
| Database | inside VM (free) | Cloud SQL `db-f1-micro` (~$8 / mo) |
| Storage | VM disk | Firebase Storage + Cloud SQL disk |
| Network | egress | egress |
| Snapshot/backup | Managed Image | Cloud SQL automated backups |
| Idle | Full burn | Near-zero |
| Burst | Vertical-only | Horizontal up to `max_instances` |

---

## Slide 19 — Lessons learned + next steps

**Lessons**
- Build for `linux/amd64` explicitly — Apple Silicon bites you
- Run script + Terraform + tfvars beats `gcloud run deploy` flags (reproducible, reviewable)
- Init DB schema in Nitro plugin — survives container restarts cleanly
- Idempotent user upsert — Google + email signup share one path
- Auth as Nitro middleware — exact whitelist beats per-route checks
- Locust headless + HTML reports — diff IaaS vs PaaS objectively
- Firestore for likes — sidesteps Postgres write contention
- Single-stage Dockerfile is fine at this scale; multi-stage premature
- Secret Manager beats env-var-in-tfvars for `DATABASE_URL`

**Next steps**
- GitHub Actions: build + push image on tag, then `terraform apply`
- Cloud Run `min_instances ≥ 1` once usage justifies removing cold start
- Full-text Postgres index on `trips(title, destination, short_description)`
- Migrate ad-hoc `initDb()` to versioned migrations (e.g. `node-pg-migrate`)
- Structured logging + Cloud Logging filters + uptime alert
- Synthetic check on `/api/trips/all`

---

## Slide 20 — Demo, references, Q&A

**Live demo checklist**
1. Open Cloud Run URL — landing page redirects
2. Sign up via email → profile setup
3. Create trip with two locations + date ranges
4. Upload cover image → Firebase Storage round-trip
5. Like another user's public trip (Firestore write)
6. Search community by city
7. Show Cloud Run revisions panel
8. Show Cloud SQL connection in console
9. Show Locust live UI under 50 RPS

**References (in repo)**
- `README.md`, `SETUP.md` (German) — quick start + local dev
- `DEPLOYMENT_GOOGLE_CLOUD.md` — IaaS + PaaS overview
- `DEPLOYMENT_RUNBOOK.md` — VM step-by-step
- `DEPLOYMENT_HTTPS.md` — Let's Encrypt
- `GOOGLE_CLOUD_FULL_SETUP.md` — full GCP setup
- `CloudRun.md` — PaaS architecture + Firebase
- `FIREBASE_AUTH_PLAN.md` — auth design notes
- `LOCUST_SETUP.md` — load test setup
- `IMPLEMENTATION.md`, `IMPLEMENTATION_PLAN.md` — story breakdown
- `terraform/` — all IaC; `scripts/deploy-cloud-run-paas.sh` — one-shot deploy

**Q&A topics.** Architecture · Auth & security · Terraform / GCP · IaaS vs PaaS trade-offs · Load test results.
