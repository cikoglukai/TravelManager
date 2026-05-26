# TravelManager — Milestone 2 Submission

This is the single Milestone-2 deliverable. It restates the assignment, maps every
requirement to what we built (with file evidence), and documents the manual Google
Cloud Console setup (Maps API, Firebase, Workload Identity, etc.) that sits outside
Terraform/Helm.

Companion documents (also in the repo):
- `docs/SOFTWARE_ARCHITECTURE.md` — Cloud Project Software Architecture Document.
- `docs/MILESTONE2_CHANGELOG.md` — narrative of every structural change M1 → M2.
- `docs/architecture/` — LikeC4 C4 model, auto-published to GitHub Pages.

---

## 1. Assignment Recap

Offer the prototype as a **B2B SaaS** product (Free / Standard / Enterprise plans),
implement the **Standard** solution across four functional areas (Trip Management,
Social Interaction, Travel Information, Destination Management), and meet the
technical requirements:

- Micro-service architecture following the **12-Factor** principles.
- Core components deployed in **Kubernetes**.
- Deployment automated through **IaC**.
- **Performance testing** scripts and a performance test report.
- Large-dataset features as **asynchronous workloads** with **control mechanisms**;
  for a top grade, test datasets that validate workload scalability.

---

## 2. From Milestone 1 to Milestone 2

**M1 state:** a single Nuxt 3 monolith (`app/` SPA + `server/` Nitro API in one
process) on Postgres + Firebase. A LikeC4 doc *described* a 7-service SaaS on GKE,
but none of it was built.

**M2:** we turned that blueprint into the running system — 7 microservices + the Nuxt
frontend, a Pub/Sub async backbone, one Postgres database per service, on GKE
Autopilot via Helm + Terraform, with a CI/CD pipeline. The old M1 monolith has
been removed; its git history remains the reference. The earlier single-VM (IaaS,
`terraform_iaas/`) and Cloud Run (PaaS, `terraform/`) stacks are kept as the
performance-comparison baseline.

---

## 3. Requirements → Implementation Map

| Requirement | Status | Where |
|---|---|---|
| Micro-service architecture | ✅ | 7 services in `services/`, single entry via `api-gateway` |
| 12-Factor | ✅ | §6 below; config via env, DB-per-service, stateless, port binding |
| Deployed in Kubernetes | ✅ | `k8s/travelmanager/` Helm chart on GKE Autopilot |
| Automated IaC | ✅ | `terraform_gke/` + Helm + `.github/workflows/deploy.yml` |
| Async workloads | ✅ | GCP Pub/Sub: feed fan-out, warning diff, newsletter, notifications |
| Control mechanisms | ✅ | per-worker `GET /api/control` + pause/resume; DLQ + capped retries |
| Test datasets for scalability | ✅ | `seed_bulk_trips.py`, `async_flood.py`, `fixtures/warnings.json` |
| Performance test scripts + report | ✅ | `tests/load/` (Locust), `tests/load/reports/` |
| SaaS plan model | ✅ | `packages/shared/tiers.js`, gateway gating, `tenants` table |
| Trip Management (extended) | ✅ | `trip-service` |
| Social Interaction (separate service) | ✅ | `social-service` (live feed + newsletter) |
| Travel Information | ✅ | `travel-info-service` (warnings + weather pollers + diff) |
| Destination Management (B2B data) | ✅ | `destination-service` (catalog + B2B aggregates) |

---

## 4. Services

| Service | Sync/Async | DB | Responsibility |
|---|---|---|---|
| `api-gateway` | sync | – | single entry; Firebase JWT verify, tenant/plan resolve, rate limit, feature gate, identity-header injection, path routing |
| `user-service` | sync | User | profiles, tenants, plans, roles |
| `trip-service` | sync | Trip | trips, locations, travel-plans, reviews, likes; RapidAPI flights/hotels/buses; geocoding; **publishes TripCreated/TripUpdated** |
| `destination-service` | sync | Destination | destination/route catalog, plan-ref hydration, **B2B aggregates** |
| `social-service` | async | Social | feed consumer + builder, follow graph, **newsletter job** |
| `travel-info-service` | async | Travel Info | warning/weather pollers, **diff engine**, raises **TravelAlert** |
| `notification-service` | async | Notification | consumes TravelAlert/NewsletterReady → **SendGrid** email |
| `frontend` | sync | – | Nuxt 3 SPA |

`packages/shared/` is the cross-cutting library every service imports: `db.js`
(Postgres pool), `firebase.js` (Firebase Admin), `identity.js` (gateway-header
middleware), `pubsub.js` (`publishEvent` / `createSubscriber`), `tiers.js` (plan
definitions + feature gates), `geocode.js` (Google Geocoding with Open-Meteo
fallback).

---

## 5. Functional Areas

### SaaS plans
| Plan | Price | SLA | Customisation | Gated features |
|---|---|---|---|---|
| Free | none | best effort | none | core trip planning |
| Standard | paid | yes | white-labelling (logo, brand colour, domain) | + personalized feed, newsletter |
| Enterprise | premium | yes | highly customisable | + B2B destination data access |

Plans are enforced centrally at the API Gateway (per-plan rate limits + feature
gating from `packages/shared/tiers.js`); tenant + white-label config live in the
User DB `tenants` table.

### Trip Management (`trip-service`)
Trips, plan locations, travel plans (template + custom-plan wizard), reviews (star
ratings in Postgres, comments in Firestore), likes, and live RapidAPI flight/hotel/
bus search. Destinations are geocoded on write (`packages/shared/geocode.js`) — the
country is needed for travel-warning matching. Publishes `TripCreated`/`TripUpdated`.

### Social Interaction (`social-service`, separate microservice)
A **personalized live feed**: `feedConsumer` fans `TripCreated`/`TripUpdated` events
out across a follow graph into `feed_entries`, scored for relevance; served by
`GET /api/feed`. A weekly **newsletter** CronJob publishes `NewsletterReady`.

### Travel Information (`travel-info-service`)
CronJob pollers fetch official travel warnings (**Auswärtiges Amt** open data) and
weather (**Open-Meteo**, keyless), then a **diff engine** matches them against active
trips (whole-word country match) and publishes `TravelAlert`. `GET /api/alerts` feeds
the SPA `AlertBanner.vue`.

### Destination Management (`destination-service`)
Destination/route catalog and plan-ref hydration for template plans. The **B2B data
API** (`GET /api/b2b/destinations/:id/travelers`) returns aggregated, anonymized
traveller marketing data, restricted to Enterprise tenants with the `destinationMgr`
role.

---

## 6. 12-Factor Mapping

| Factor | Implementation |
|---|---|
| I Codebase | one monorepo, npm workspaces; one deployable per service |
| II Dependencies | per-service `package.json`; Nitro bundles output |
| III Config | all config via env; secrets in GCP Secret Manager (ESO) |
| IV Backing services | Cloud SQL, Pub/Sub, Firestore, SendGrid as attached resources |
| V Build/release/run | CI builds images → Artifact Registry → Helm release |
| VI Processes | stateless services; state in Postgres/Firestore |
| VII Port binding | each service binds `NITRO_PORT` (8080) |
| VIII Concurrency | scale-out via Deployments + HPA; workers scale independently |
| IX Disposability | fast boot (non-blocking schema bootstrap), graceful probes |
| X Dev/prod parity | same images locally (`docker-compose.dev.yml` / kind) and on GKE |
| XI Logs | structured stdout → Cloud Logging |
| XII Admin processes | schema bootstrap on start; CronJobs for scheduled tasks |

**Database-per-service:** one Cloud SQL Postgres 16 instance hosts one *logical
database* per service (preserves the 12F boundary while billing a single instance —
a documented cost trade-off). Cross-service hard FKs were removed: author/reviewer
names are denormalized at write time; template plans hydrate destination data over
HTTP.

---

## 7. Asynchronous Workloads + Control

**Backbone:** GCP Pub/Sub topics `TripCreated`, `TripUpdated`, `TravelAlert`,
`NewsletterReady`. Each topic has a **dead-letter topic** and **capped delivery
attempts** (`max_delivery_attempts = 5`, see `terraform_gke/pubsub.tf`).

- **Publishers:** trip-service (TripCreated/Updated), travel-info (TravelAlert),
  social (NewsletterReady).
- **Consumers:** social (feed build), notification (alert + newsletter email) — via
  pull subscribers (`createSubscriber`) or Pub/Sub push endpoints.
- Poison messages are **ack-dropped** (unparseable JSON) instead of redelivering
  forever.

**Control mechanism (required):** each worker exposes `GET /api/control` (processed
counts, last-run, lag) plus **pause/resume** endpoints:
- `services/travel-info-service/api/control/index.get.js` + `[worker]/pause.post.js`
  + `[worker]/resume.post.js`
- `services/social-service/api/control/index.get.js`
- `services/notification-service/api/control/index.get.js`

Scheduled work (pollers, newsletter) runs as Kubernetes **CronJobs** that POST to the
owning service's task endpoint (`/api/tasks/poll-warnings`, `/api/tasks/newsletter`).

---

## 8. Deployment & Infrastructure (IaC)

### Kubernetes (GKE Autopilot) — `k8s/travelmanager/`
Helm chart renders: Deployment + Service + **HPA** per sync service; worker
Deployments; **CronJobs** (pollers/newsletter); **GKE Ingress** (managed TLS + static
IP) routing `/api`→gateway, `/`→frontend; **Cloud SQL Auth Proxy** sidecar; secrets
via **External Secrets Operator** from Secret Manager; **Workload Identity** for
keyless GCP access; **NetworkPolicies** (downstream services reachable only from
TravelManager pods, because they trust gateway-injected identity headers).

The chart is dual-mode — `values-local.yaml` runs the whole stack on kind/minikube
(in-cluster Postgres, plain Secrets, nginx ingress, `PUBSUB_DISABLED=1`).

### Terraform — `terraform_gke/`
Provisions: GKE Autopilot cluster, Artifact Registry repo, reserved static IP, Cloud
SQL Postgres 16 + 6 per-service databases + per-service `DATABASE_URL` secrets, the
runtime GCP service account + IAM + Workload Identity binding, Secret Manager secrets
(RapidAPI / SendGrid / Firebase SA / Google Maps server key), and the full Pub/Sub
topology (topics + subscriptions + DLQs + Pub/Sub service-agent IAM).

### CI/CD — `.github/workflows/deploy.yml`
On push to `main`: **test** (compile-check all services) → **build & push** 8 images
to Artifact Registry (tagged `$GITHUB_SHA` + `latest`) → **deploy** via
`helm upgrade --install` to GKE. Authentication uses **Workload Identity Federation**
(no JSON keys).

---

## 9. Google Cloud Console — Manual Setup

Terraform + Helm provision the cluster and most resources, but the following must be
set up by hand (console / gcloud / GitHub). Do these **once** per project.

### 9.1 Project + billing
1. Create a GCP project; **link a billing account** (Maps APIs and Cloud SQL require
   billing enabled).
2. Local Terraform auth: `gcloud auth application-default login`.

### 9.2 Google Maps APIs (two keys)
The app uses Maps in two places, needing two separate keys:

**a) Browser key — `NUXT_PUBLIC_GOOGLE_MAPS_KEY`** (used by
`app/composables/useGoogleMaps.js`, loads the JS SDK with `libraries=places,marker`):
1. **APIs & Services → Library** → enable **Maps JavaScript API** and **Places API**.
2. **APIs & Services → Credentials → Create credentials → API key**.
3. **Restrict the key:** Application restrictions → **HTTP referrers**, add your
   domain (`https://onecloudaway.de/*`) and `http://localhost/*` for dev. API
   restrictions → limit to Maps JavaScript API + Places API.
4. This key ships in the SPA bundle (it is a public client key — referrer
   restriction, not secrecy, protects it). Store it as a **GitHub Actions secret**
   `NUXT_PUBLIC_GOOGLE_MAPS_KEY` (injected at deploy via `global.extraEnv`).

**b) Server key — `GOOGLE_MAPS_SERVER_KEY`** (used by `packages/shared/geocode.js`
for the Geocoding REST API; without it, geocoding falls back to keyless Open-Meteo):
1. **Library** → enable **Geocoding API**.
2. **Credentials → Create API key**; restrict API access to Geocoding API. (Optional
   IP restriction is awkward on Autopilot egress, so this key relies on API
   restriction.)
3. Put its value into `terraform_gke/terraform.tfvars` (`google_maps_server_key`);
   Terraform stores it in Secret Manager as `google-maps-server-key`, and ESO syncs
   it into the trip-service pod.

### 9.3 Firebase (auth + Firestore)
1. Create/attach a **Firebase project** to the GCP project.
2. **Authentication** → enable the **Email/Password** provider; add your production
   domain and `localhost` to **Authorized domains**.
3. **Firestore** → create a database (stores review comments + likes).
4. **Project settings → Service accounts** → generate a private key (JSON) → put it
   into `terraform.tfvars` (`firebase_service_account`); Terraform stores it as the
   `firebase-service-account` secret. *(On GKE, Workload Identity can replace this SA
   key for Firestore access.)*
5. **Project settings → Your apps (Web)** → copy the web config into GitHub secrets:
   `NUXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`,
   `_STORAGE_BUCKET` (all public client config).

### 9.4 Workload Identity Federation for GitHub Actions (not in Terraform)
1. Create a **Workload Identity pool** + an **OIDC provider** for
   `token.actions.githubusercontent.com`, with an attribute condition restricting to
   your repo.
2. Create a **deploy service account** with roles `artifactregistry.writer`,
   `container.developer`, plus read access to the secrets the deploy needs.
3. Bind `roles/iam.workloadIdentityUser` on that SA to the repo principal.
4. Add GitHub Actions secrets: `WIF_PROVIDER` (provider resource name), `DEPLOY_SA`
   (SA email), `GCP_PROJECT`, `CLOUD_SQL_INSTANCE`.

### 9.5 External Secrets Operator (not in the chart)
The chart emits `ExternalSecret` CRs that reference a `ClusterSecretStore` named
`gcp-secret-store`. Install ESO once (its Helm chart) into the cluster, then create
the `ClusterSecretStore` pointing at GCP Secret Manager (it authenticates via the
runtime SA through Workload Identity).

### 9.6 Other keys (optional features)
- **RapidAPI key** (`rapidapi_key` tfvar) — live flights/hotels/buses (Sky Scrapper +
  Booking.com). Without it those panels degrade.
- **SendGrid key** (`sendgrid_api_key` tfvar) — alert/newsletter email. Without it
  notifications are logged, not sent.
- Travel warnings + weather are **keyless** (Auswärtiges Amt + Open-Meteo).

### 9.7 DNS
Point the `ingress.host` domain (`onecloudaway.de` in `values.yaml`) A record at the
reserved static IP (`terraform output ingress_ip`). The GKE ManagedCertificate only
provisions once DNS resolves to that IP.

### 9.8 One-time bring-up order
1. Create project + billing; `gcloud auth application-default login`.
2. `cd terraform_gke && cp terraform.tfvars.example terraform.tfvars` → fill
   `project_id`, `db_password`, and the API/Firebase secrets (§9.2b, §9.3, §9.6).
3. `terraform init && terraform apply`.
4. Set up WIF pool + deploy SA; add all GitHub Actions secrets (§9.2a, §9.3, §9.4).
5. `gcloud container clusters get-credentials travelmanager-gke --region europe-west1`.
6. Install External Secrets Operator + create the `gcp-secret-store` store (§9.5).
7. Point DNS at the static IP (§9.7).
8. Push to `main` (or run the workflow manually) → CI builds + `helm upgrade`.

---

## 10. Performance Testing

Locust harness in `tests/load/` (`locustfile.py`). Two user classes: `BrowsingUser`
(anonymous, weight 3) and `AuthedUser` (Firebase-signed-in, weight 1, real
`signInWithPassword` token flow). Load shapes in `tests/load/shapes/`:
- **periodic** — 4 cycles × 240s, 20 ↔ 100 users (stresses autoscaling cooldown).
- **spike** — sudden burst 10 → 500 users (once-in-a-lifetime workload).

**Scalability test datasets:** `seed_bulk_trips.py` generates large trip volumes;
`async_flood.py` floods `TripCreated` to exercise the async pipeline (feed build +
warning diff); `fixtures/warnings.json` + a `seed-warnings` endpoint give the diff
engine deterministic input. Worker scaling is observed via `kubectl get hpa` and the
per-worker `/api/control` endpoints.

**Reports** in `tests/load/reports/` (Locust HTML + CSV) cover smoke / periodic /
spike / 2000-user runs across local, IaaS (GCE VM), and Cloud Run targets — used as
the deployment-model comparison baseline. `reports/REPORT.md` is the protocol +
results template.

---

## 11. How to Run

**Local (docker-compose, no k8s, zero keys):**
```
docker compose -f docker-compose.dev.yml up --build
curl localhost:8080/api/destinations
curl -H 'x-debug-uid: u1' -X POST localhost:8080/api/users -d '{"name":"Demo"}'
```

**Local Kubernetes (real pods on kind):**
```
brew install kind helm
./scripts/kind-up.sh                 # build+load 8 images, install ingress, helm install
./scripts/gen-local-secret.sh        # optional: real Firebase/RapidAPI keys from .env
# open http://localhost
kubectl get pods,svc,hpa,cronjob
```

**Cloud (GKE):** see §9.8.

---

## 12. Known Limitations

- User rename does not propagate to denormalized `author_name`/`reviewer_name`
  (would need a `UserRenamed` event consumer).
- Local-k8s Postgres is `emptyDir` (ephemeral); HPA on kind needs metrics-server.
- Rate limiter is per-replica in-memory (Redis-backed needed for true multi-replica
  SLA).
- `reports/REPORT.md` results table still has `<TBD>` cells to fill from the latest
  GKE runs.
