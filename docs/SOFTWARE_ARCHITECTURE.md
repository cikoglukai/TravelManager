# TravelManager — Cloud Project Software Architecture Document

**Course:** Cloud Application Development (Summer Term 2026), Prof. Dr. Markus Eiglsperger
**Team:** Kai Cikoglu · Nina Karl · Johanna Prinz · Daniel Rill
**Milestone:** Cloud-native Application (Production-grade)

---

## 0. Plain-language summary

*(For readers who want the gist before the technical detail.)*

TravelManager is a travel-planning app sold to businesses on three plans (Free,
Standard, Enterprise). It does four things: plan trips, share them in a social feed,
warn travellers about danger/weather affecting their trips, and sell anonymized
traveller data to destinations.

Instead of one large program, it is built as several **small independent services**,
each doing one job and owning its own database. All user traffic enters through one
**front door** (the API Gateway) that checks the login and plan. Slow work — building
feeds, scanning travel warnings, sending email — runs **in the background** so the app
stays fast, and those background workers can be paused, resumed, and monitored. The
whole system runs on Google Cloud Kubernetes, and every piece of infrastructure is
created automatically from code (Terraform + Helm + GitHub Actions).

A glossary of the technical terms (Pub/Sub, HPA, 12-Factor, ESO, …) is at the end of
this document (§8).

---

## 1. Context & Functional Scope

TravelManager is a social travel-management application offered as a **B2B SaaS**
product. Milestone-1 trip planning (trips, locations, plans, reviews, likes) is
retained as the hygiene baseline; this milestone adds destination management,
travel information, an expanded social layer, and the SaaS/operational concerns
of a production cloud-native system.

### SaaS plans
| Plan | Price | SLA | Customisation | Gated features |
|------|-------|-----|---------------|----------------|
| Free | none | best effort | none | core trip planning |
| Standard | paid | yes | white-labelling (logo, brand colour, domain) | + personalized feed, newsletter |
| Enterprise | premium | yes | highly customisable | + B2B destination data access |

Plans are enforced centrally at the **API Gateway** (rate limits + feature
gating from `packages/shared/tiers.js`); tenants and white-label config live in
the User DB.

### Functional areas
- **Trip Management** — `trip-service`: trips, plan locations, travel plans
  (template + custom wizard), reviews (stars in Postgres, comments in Firestore),
  likes, and live RapidAPI flight/hotel/bus search.
- **Social Interaction** — `social-service` (separate microservice): a
  personalized **live feed** built asynchronously from trip events scored against
  a follow graph, plus a weekly **newsletter** job.
- **Travel Information** — `travel-info-service`: scheduled pollers fetch
  official travel warnings (**Auswärtiges Amt** open data) and weather
  (**Open-Meteo**), diff them against active trips, and raise `TravelAlert`s.
- **Destination Management** — `destination-service`: destination/route catalog
  plus a **B2B data API** giving Enterprise destination managers aggregated,
  anonymized traveller marketing data.

---

## 2. Architecture Overview

Microservice architecture; all client traffic enters through a single API
Gateway. Synchronous services handle request/response; asynchronous workers
consume domain events over GCP Pub/Sub.

```
                       ┌─────────────┐
   Traveler / B2B ───► │ API Gateway │  JWT verify · tenant/plan · rate limit
                       └──────┬──────┘  · feature gate · inject identity headers
        ┌─────────────┬───────┼───────────────┬───────────────┐
        ▼             ▼       ▼               ▼               ▼
   user-service  trip-service destination  social-service  travel-info
       │  DB        │  DB     -service DB      │  DB         -service DB
       │            │            │             ▲                │
       │            │ publish    │             │ subscribe      │ publish
       │            └──► Pub/Sub: TripCreated/TripUpdated ──────┤
       │                  TravelAlert ◄────────────────────────┘
       │                  NewsletterReady ◄── social newsletter job
       │                         │ subscribe
       │                         ▼
       │                 notification-service ──► SendGrid (email)
       └─ tenant/plan lookups (gateway, notification)
```

The full C4 model is maintained in `docs/architecture/workspace.dsl` (LikeC4,
auto-published to GitHub Pages). This document and that model describe the
**built** system.

### Services
| Service | Sync/Async | Owns DB | Responsibility |
|---------|-----------|---------|----------------|
| api-gateway | sync | – | single entry, auth, tenancy, rate limit, routing |
| user-service | sync | User | profiles, tenants, plans |
| trip-service | sync | Trip | trips/locations/plans/reviews/likes, RapidAPI, **publishes TripCreated/Updated** |
| destination-service | sync | Destination | catalog, plan-ref hydration, **B2B aggregates** |
| social-service | async | Social | feed consumer + builder, follow graph, **newsletter job** |
| travel-info-service | async | Travel Info | warning/weather pollers, **diff engine**, raises TravelAlert |
| notification-service | async | Notification | consumes TravelAlert/NewsletterReady, SendGrid email |
| frontend | sync | – | Nuxt 3 SPA |

`packages/shared` provides the cross-cutting modules: Postgres pool, Firebase
Admin, gateway-identity middleware, Pub/Sub helpers, and plan/tier definitions.

---

## 3. Key Design Decisions

- **Database per service (12-Factor).** Each service owns its schema. A single
  Cloud SQL Postgres 16 instance hosts one *logical database* per service — this
  preserves the boundary while billing one instance (deliberate cost trade-off).
  Cross-service hard FKs are removed: author/reviewer display names are
  denormalised at write time; template travel plans hydrate destination data via
  HTTP to `destination-service`.
- **Centralised authentication.** Only the gateway verifies the Firebase JWT. It
  forwards trusted identity (`x-user-uid`, `x-tenant-id`, `x-plan`, `x-role`) to
  internal services, so Firebase Admin credentials live in one place.
- **Asynchronous workloads with control.** Large/long-running work
  (feed fan-out, warning diffing, newsletter, notifications) runs off Pub/Sub,
  not in the request path. Each topic has a dead-letter topic + capped delivery
  attempts; each worker exposes `GET /api/control` (processed counts, last-run,
  lag) and pause/resume endpoints — the required workflow control mechanism.
- **Scheduled work as CronJobs.** Pollers and the newsletter run as Kubernetes
  CronJobs that POST to the owning service's task endpoint.

---

## 4. 12-Factor Mapping

| Factor | Implementation |
|--------|----------------|
| I Codebase | one monorepo, npm workspaces; one deployable per service |
| II Dependencies | per-service `package.json`; Nitro bundles output |
| III Config | all config via env; secrets in GCP Secret Manager (ESO) |
| IV Backing services | Cloud SQL, Pub/Sub, Firestore, SendGrid as attached resources |
| V Build/release/run | CI builds images → Artifact Registry → Helm release |
| VI Processes | stateless services; state in Postgres/Firestore |
| VII Port binding | each service binds `NITRO_PORT` (8080) |
| VIII Concurrency | scale-out via Deployments + HPA; workers scale independently |
| IX Disposability | fast boot (non-blocking schema bootstrap), graceful probes |
| X Dev/prod parity | same images locally (`docker-compose.dev.yml`) and on GKE |
| XI Logs | structured stdout → Cloud Logging |
| XII Admin processes | schema bootstrap on start; CronJobs for scheduled tasks |

---

## 5. Deployment & Infrastructure (IaC)

- **Kubernetes (GKE Autopilot)** runs every component. `k8s/travelmanager` Helm
  chart: Deployment + Service + **HPA** per sync service; worker Deployments;
  **CronJobs** for pollers/newsletter; **GKE Ingress** (managed TLS, static IP)
  routing `/api`→gateway, `/`→frontend; Cloud SQL Auth Proxy sidecar; secrets via
  **External Secrets Operator** from Secret Manager; **Workload Identity** for
  keyless GCP access.
- **Terraform** (`terraform_gke/`) provisions the GKE cluster, Cloud SQL +
  per-service databases + DATABASE_URL secrets, Pub/Sub topics/subscriptions +
  DLQs, Artifact Registry, the runtime GCP service account + IAM, and the
  ingress IP. (The earlier Cloud Run stack (`terraform/`) and GCE/IaaS stack
  (`terraform_iaas/`) remain as the deployment-model comparison baseline used in
  the performance report.)
- **CI/CD** (`.github/workflows/deploy.yml`): on push to `main` → build all
  services → push per-service images to Artifact Registry → `helm upgrade` to
  GKE, authenticated via Workload Identity Federation.

---

## 6. Performance Testing

Locust harness in `tests/load`. Existing synchronous scenarios (browsing +
authenticated CRUD) with `periodic` and `spike` load shapes and reports
(`reports/`, incl. 2000-user stress on Cloud Run and IaaS). Added for this
milestone: `async_flood.py` stresses the asynchronous pipeline (TripCreated →
feed build → warning diff), `seed_bulk_trips.py` generates large test datasets,
and `fixtures/warnings.json` + the `seed-warnings` endpoint give the diff engine
deterministic input. Worker scaling is observed via `kubectl get hpa` and the
per-worker `/api/control` endpoints.

---

## 7. Running It

**Local (all services):**
```
docker compose -f docker-compose.dev.yml up --build
curl localhost:8080/api/destinations
curl -H 'x-debug-uid: u1' -X POST localhost:8080/api/users -d '{"name":"Demo"}'
```

**Cloud (GKE):**
```
cd terraform_gke && terraform init && terraform apply
gcloud container clusters get-credentials travelmanager-gke --region europe-west1
helm upgrade --install travelmanager k8s/travelmanager --set global.gcpProject=$PROJECT ...
```

See `docs/architecture/` (LikeC4) for the rendered C4 diagrams.

---

## 8. Glossary

| Term | Plain meaning |
|------|---------------|
| **Microservice** | One small program that does a single job and owns its own data, instead of one big program doing everything. |
| **API Gateway** | The single front door all user requests pass through; checks login + plan, then forwards. |
| **Pub/Sub** | Google Cloud's message system: a service "publishes" an event; other services "subscribe" and react later (background work). |
| **Event / async workload** | Work done later in the background (after publishing an event) instead of while the user waits. |
| **Worker** | A background service that consumes events and does the slow work (feed build, warning scan, email). |
| **Dead-letter topic (DLQ)** | A holding area for messages that keep failing, so they don't retry forever. |
| **Kubernetes / GKE** | The system that runs and supervises all the service containers; GKE is Google's managed Kubernetes. |
| **Helm** | A templating tool that describes what to run on Kubernetes as reusable config (a "chart"). |
| **HPA (Horizontal Pod Autoscaler)** | Automatically adds/removes copies of a service based on load. |
| **CronJob** | A scheduled task (e.g. "poll travel warnings every hour"). |
| **Ingress** | The Kubernetes entry point from the internet, with HTTPS/TLS. |
| **Terraform / IaC** | "Infrastructure as Code" — cloud resources (databases, network, cluster) created from text files instead of by hand. |
| **CI/CD** | Automated pipeline that builds and deploys the app on every push (here: GitHub Actions). |
| **12-Factor** | A checklist of best practices for cloud apps (config in env vars, stateless processes, etc.); mapped in §4. |
| **ESO (External Secrets Operator)** | Pulls passwords/keys from Google Secret Manager into the cluster securely. |
| **Workload Identity** | Lets services prove their identity to Google Cloud without storing secret key files. |
| **Firestore** | Google's NoSQL database, used here for review comments and likes. |
| **SLA** | Service Level Agreement — a guaranteed level of availability/support (Standard & Enterprise plans). |
| **White-labelling** | Letting a customer rebrand the app with their own logo, colours, and domain. |
