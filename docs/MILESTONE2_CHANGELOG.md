# Milestone 2 — Cloud-native Rebuild: What We Did & Had To Change

This document records the full set of changes that took TravelManager from the
Milestone-1 prototype to the Milestone-2 production-grade, cloud-native system.
It is a narrative + checklist of every structural change, why it was needed, and
how to run the result.

---

## 1. Starting Point vs Requirement

**Milestone-1 state:** a single **Nuxt 3 monolith** (`app/` frontend + `server/`
Nitro API in one process/container) on PostgreSQL + Firebase, deployed to Cloud
Run / a GCE VM. A LikeC4 document (`docs/architecture/workspace.dsl`) *described*
a 7-service microservice SaaS on GKE — but none of it was built.

**Milestone-2 requirement:** microservice architecture, 12-Factor, deployed in
Kubernetes, automated IaC, async workloads with control, performance tests, plus
new functional areas (Travel Information, expanded Social, Destination
Management) and a SaaS B2B plan model.

**Gap we closed:** turned the LikeC4 blueprint into the actual running system.

---

## 2. Architecture Now

```
Client / B2B ─► API Gateway ─► sync: user · trip · destination
                   │           async: social · travel-info · notification
                   │           events over GCP Pub/Sub
                   └─ JWT verify · tenant/plan · rate limit · feature gate · inject identity
```

7 services + Nuxt frontend, one Postgres database per service, Pub/Sub backbone
(`TripCreated`, `TripUpdated`, `TravelAlert`, `NewsletterReady`), all on GKE via
Helm + Terraform. Shared code in `packages/shared`.

---

## 3. Structural Changes (Phase 0–1)

### Monorepo
- Converted the repo to **npm workspaces**: `package.json` gained
  `workspaces: ["packages/*", "services/*"]`.
- Added `packages/shared/` — the cross-cutting library every service imports:
  - `db.js` — Postgres pool factory (env-driven `DATABASE_URL`).
  - `firebase.js` — Firebase Admin init + `getAuthClient()` / `getFirestoreDb()`.
  - `identity.js` — middleware that populates `event.context.user` from
    gateway-injected `x-user-*` headers (+ `requireUser`).
  - `pubsub.js` — `publishEvent()` + `createSubscriber()` (controllable: pause,
    stats, ack/nack).
  - `tiers.js` — Free/Standard/Enterprise plan definitions + feature gates.
- Each service is a **standalone Nitro app** (`services/<name>/` with
  `nitro.config.ts`, `api/` routes, `middleware/identity.js`, `utils/`,
  `plugins/`). Reused the existing Nitro handler style verbatim.
- Added one parameterized `Dockerfile.service` (build-arg `SERVICE=<name>`) for
  all services; the root `Dockerfile` stays for the frontend.
- Moved the old monolith API to `archive/monolith-server/` (was `server/`).

### Services created
| Service | What moved/was built |
|---------|----------------------|
| `user-service` | users CRUD + `tenants`/plans schema; tenant lookup |
| `trip-service` | trips, locations, reviews, likes, travel-plans, RapidAPI flights/hotels/buses; **publishes TripCreated/Updated** |
| `destination-service` | destination catalog, `plan-refs` hydration, **B2B aggregates** |
| `api-gateway` | JWT verify, tenant/plan resolve, rate limit, feature gate, identity-header injection, path routing |
| `social-service` | feed consumer/builder, follow graph, newsletter cron (**new**) |
| `travel-info-service` | warning/weather pollers, diff engine, raises TravelAlert (**new**) |
| `notification-service` | consumes TravelAlert/NewsletterReady → SendGrid email (**new**) |

### DB-per-service changes (had to change)
- Split the single schema into per-service `utils/schema.js` bootstraps.
- **Removed cross-service hard FKs.** `reviews.reviewer_id`/`trips.user_uid` no
  longer FK the `users` table (it lives in another service's DB).
- **Denormalized display names**: added `author_name` to `trips` and
  `reviewer_name` to `reviews`, captured from the gateway identity at write time
  — replaces the old `JOIN users` in `trips/all` and the reviews list.
- **Template travel-plans hydrate over HTTP**: `travel-plans/:tripId` GET calls
  `destination-service /api/plan-refs` instead of a cross-DB JOIN.
- One Cloud SQL instance, one *logical database* per service (documented cost
  trade-off vs one instance each).

### Frontend changes
- Dropped `serverDir` from `nuxt.config.js`; the SPA is now pure frontend.
- `useApiFetch` prefixes `apiBase` (empty = same-origin; ingress/nginx route
  `/api` → gateway).
- Added `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_GOOGLE_MAPS_KEY` config.
- New: `components/AlertBanner.vue` (travel warnings), `components/LocationMap.vue`
  + `composables/useGoogleMaps.js` (Maps Places), `pages/feed.vue` (social feed),
  feed link in nav.

---

## 4. New Functional Areas

- **SaaS tiers (gateway):** `tenants` table (plan + white-label fields). Gateway
  enforces per-plan **rate limits** and **feature gating** (feed = Standard+,
  B2B = Enterprise) from `packages/shared/tiers.js`. Internal endpoints assign
  tenant plan + user role.
- **Travel Information:** CronJob pollers hit **Auswärtiges Amt** open data
  (warnings) and **Open-Meteo** (weather, keyless). A diff engine matches them
  against active trips and publishes `TravelAlert`; `GET /api/alerts` feeds the
  SPA banner. Control endpoints (`/api/control`, pause/resume) per worker.
- **Social:** `feedConsumer` fans out trip events to a follow graph into
  `feed_entries`; `GET /api/feed`; weekly newsletter CronJob → `NewsletterReady`.
- **Notification:** consumes `TravelAlert` + `NewsletterReady`, emails via
  **SendGrid** (logs if no key).
- **Destination B2B:** `GET /api/b2b/destinations/:id/travelers` — aggregated,
  anonymized marketing data (Enterprise + `destinationMgr` role).

---

## 5. Async Backbone + Control (Phase 3)

- GCP **Pub/Sub** topics + subscriptions, each with a **dead-letter topic** and
  capped delivery attempts.
- Publishers: trip-service (TripCreated/Updated), social (NewsletterReady),
  travel-info (TravelAlert).
- Consumers: social (feed), notification (alert/newsletter) — via pull
  subscribers (`createSubscriber`) **or** Pub/Sub push endpoints (`/api/events/*`).
- **Control mechanism:** per-worker `/api/control` (processed counts, last-run,
  lag) + pause/resume; CronJobs trigger pollers/newsletter.

---

## 6. Infrastructure (Phase 9–11)

- **Helm chart** `k8s/travelmanager/`: Deployment+Service+**HPA** per sync
  service, worker Deployments, **CronJobs** (pollers/newsletter), **Ingress**
  (`/api`→gateway, `/`→frontend), Cloud SQL Auth Proxy sidecar, **External
  Secrets Operator** from Secret Manager, **Workload Identity** SA,
  NetworkPolicies.
- **Terraform** `terraform_gke/`: GKE Autopilot cluster, Cloud SQL + per-service
  DBs + DATABASE_URL secrets, Pub/Sub topics/subs + DLQs + service-agent IAM,
  Artifact Registry, runtime SA + IAM, ingress static IP. (Old Cloud Run / GCE
  stacks kept under `archive/` as the perf-comparison baseline.)
- **CI/CD** `.github/workflows/deploy.yml`: build all → push per-service images
  to Artifact Registry → `helm upgrade` to GKE via Workload Identity Federation.

---

## 7. Performance Testing (Phase 12)

- Kept the Milestone-1 Locust suite (browsing + authenticated, periodic/spike
  shapes, reports).
- Added `tests/load/async_flood.py` (floods TripCreated → exercises feed build +
  warning diff), `seed_bulk_trips.py` (large test dataset), and
  `fixtures/warnings.json` + a `seed-warnings` endpoint for deterministic diff
  input. Worker scaling observed via `kubectl get hpa` + `/api/control`.

---

## 8. Fixes From the Code Review

A multi-angle review surfaced defects we then fixed:

| Area | Fix |
|------|-----|
| GKE probes | per-service `healthPath` (frontend `/`, gateway `/healthz`) — frontend was crash-looping on `/api/health` |
| Trust model | added **NetworkPolicies** so only TravelManager pods reach services (they trust `x-user-*` headers) |
| B2B role | `destinationMgr` was never assignable → added internal `PATCH /api/internal/users/:id` (role + tenant) |
| Poison messages | `JSON.parse` in push handlers + pull subscriber now **ack-drop** unparseable msgs instead of infinite redeliver |
| Dead-letter | added Pub/Sub **service-agent IAM** (publisher on DLQ, subscriber on subs) + `google-beta` provider; without it DLQ never drained |
| Date filter | `start_date` is TEXT — changed `NOW()::text` → `CURRENT_DATE::text` (was excluding today's trips) |
| Feed score | guard `Date.parse` NaN (was throwing on bad dates → nack loop) |
| Tenant leak | public `GET /api/tenants/:id` returns white-label only; new internal endpoint exposes plan to the gateway |
| Gateway cache/limit | resolve cache + rate-limiter now **bounded** (LRU); rate limit keyed **per uid** (was a shared `default`-tenant bucket) |
| Feed gating | only exact `/api/feed` gated — `/api/feed/follows` (free social primitive) no longer blocked |
| Alert matching | whole-word country match (no `Oman`⊂`Romania`); `content_hash` includes country (no dropped alerts) |
| Defense in depth | `feed.get.js` now actually checks the plan its comment claimed |
| Default tenant | set to `standard` (was `enterprise`, which made all gating moot) |
| Autopilot | Cloud SQL sidecar `runAsUser: 65532` + resource limits |

---

## 9. Local Kubernetes Support (added after review)

To run real pods locally (kind/minikube) we made the chart dual-mode:

- New flags: `global.cloudSql.enabled`, `global.imagePullPolicy`,
  `global.extraEnv`, `ingress.className`/`managedCert`, conditional WI annotation.
- New templates: `postgres-local.yaml` (in-cluster Postgres, gated
  `postgres.enabled`), `local-secrets.yaml` (plain Secrets when ESO disabled).
- `values-local.yaml` overlay: in-cluster Postgres, plain Secrets, `nginx`
  ingress, no Cloud SQL sidecar / ESO / Workload Identity, `PUBSUB_DISABLED=1`,
  gateway skip-auth, locally built images.
- `scripts/kind-up.sh`: create kind cluster → install ingress-nginx → build +
  `kind load` 8 images → `helm install -f values-local.yaml`.
  - Fixed a startup race: replaced `kubectl wait --selector` (errored
    "no matching resources found" before the pod existed) with
    `kubectl rollout status` then wait.

Also `docker-compose.dev.yml` + `nginx/dev.conf` + `scripts/init-multi-db.sql`
run the whole stack without Kubernetes.

### 9a. Bugs found by actually running it on kind (and fixed)

Running the stack on a local kind cluster surfaced defects that build-green had
hidden:

- **Build-time env baking.** `runtimeConfig` in `nitro.config.ts` reads
  `process.env.X` *at build time*, so every inter-service URL + API key was
  frozen to its `localhost` default in the image. The k8s env vars
  (`DESTINATION_SERVICE_URL=...`) never overrode them → gateway proxied to
  `localhost:3003` → **502**. Fix: read `process.env` **at request time** in code
  (gateway `serviceUrl()`/`resolve.js`, trip-service `rapidapi`/travel-plans,
  destination B2B, travel-info `cfgEnv()`, notification `notify`, worker sub
  names) instead of via `useRuntimeConfig()`.
- **`proxyRequest` threw 502.** h3's `proxyRequest` failed even on clean
  in-cluster GETs. Replaced with a hand-rolled fetch proxy
  (`api-gateway/utils/proxy.js`): curated headers, strips hop-by-hop +
  `accept-encoding`, injects identity headers.
- **Host-based ingress blocked `localhost`.** The ingress `host:` rule meant
  `http://localhost` → 404. Made the host optional; `values-local.yaml` sets
  `ingress.host: ""` (catch-all) so plain `localhost` works.
- **Frontend crashed on missing Firebase key** (`auth/invalid-api-key`).
  Guarded `0.firebase.client.js` + `useAuth` to skip init when no `apiKey` (SPA
  boots; auth disabled). Real keys wired via the secret overlay below.
- **`kind-up.sh` wait race.** `kubectl wait --selector` errored
  "no matching resources found" before the ingress controller pod existed →
  switched to `kubectl rollout status`.

### 9b. Secrets without committing them

`scripts/gen-local-secret.sh` reads the root `.env` and writes a **gitignored**
`k8s/travelmanager/values-local.secret.yaml`: Firebase web config (public) →
`global.extraEnv` (frontend), `RAPIDAPI_KEY` (secret) → trip-service Secret. Apply
with `helm upgrade -f values-local.yaml -f values-local.secret.yaml`.

Reminder: `process.env.X` inside `nitro.config.ts runtimeConfig` is build-time
only — always read runtime config from `process.env` directly in handler code.

---

## 10. How To Run

**Local, no k8s:**
```
docker compose -f docker-compose.dev.yml up --build
curl localhost:8080/api/destinations
curl -H 'x-debug-uid: u1' -X POST localhost:8080/api/users -d '{"name":"Demo"}'
```

**Local Kubernetes (pods):**
```
brew install kind helm                 # docker + kubectl already present
./scripts/kind-up.sh                   # build+load 8 images, install ingress, helm install
./scripts/gen-local-secret.sh          # optional: real Firebase/RapidAPI keys from .env
helm upgrade travelmanager k8s/travelmanager \
  -f k8s/travelmanager/values-local.yaml -f k8s/travelmanager/values-local.secret.yaml
kubectl rollout restart deploy/frontend deploy/trip-service
# open http://localhost   (catch-all ingress; no hosts entry needed)
kubectl get pods,svc,hpa,cronjob
```
Authed API via curl (gateway skip-auth): `curl -H 'x-debug-uid: u1' http://localhost/api/trips`.
Browser login needs the Firebase web config (secret overlay) + Email/Password
enabled and `localhost` in Firebase authorized domains.

**Cloud (GKE):**
```
cd terraform_gke && terraform init && terraform apply
gcloud container clusters get-credentials travelmanager-gke --region europe-west1
helm upgrade --install travelmanager k8s/travelmanager \
  --set global.gcpProject=$PROJECT --set global.imageRegistry=... --set global.cloudSqlInstance=...
```

---

## 11. API Keys Needed

| Key | Required? | Powers | Source |
|-----|-----------|--------|--------|
| `NUXT_PUBLIC_FIREBASE_*` (5) + `FIREBASE_SERVICE_ACCOUNT` + `GOOGLE_CLOUD_PROJECT` | **Yes** (prod auth) | login + Firestore likes/reviews; gateway JWT verify | Firebase console. On GKE, Workload Identity replaces the SA key |
| `RAPIDAPI_KEY` | Optional | live flights + hotels | rapidapi.com (Sky Scrapper + Booking.com) |
| `NUXT_PUBLIC_GOOGLE_MAPS_KEY` | Optional | LocationMap / Places | GCP → Maps JavaScript API + Places API |
| `SENDGRID_API_KEY` | Optional | alert/newsletter email | sendgrid.com |
| Travel warnings / weather | **None** | Auswärtiges Amt + Open-Meteo | keyless |

Local demo needs **zero keys** (`GATEWAY_SKIP_AUTH=1`, Firestore features
degrade gracefully).

---

## 12. Known Limitations / Follow-ups

- User rename does not propagate to denormalized `author_name`/`reviewer_name`
  (would need a UserRenamed event consumer).
- `trips/all` now lists orphan trips (no INNER JOIN to users anymore).
- Postgres in local k8s is `emptyDir` (ephemeral).
- HPA on kind needs metrics-server installed separately.
- Rate limiter is per-replica in-memory (Redis-backed for true multi-replica SLA).
- Pub/Sub disabled locally — async flow needs the emulator or manual task triggers.
