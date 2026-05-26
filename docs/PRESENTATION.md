# TravelManager — Presentation Source (Milestone 2, 20 slides)

> Source-of-truth document for a slide deck on the **Milestone-2** TravelManager:
> a B2B SaaS travel platform built as **microservices** with an asynchronous
> Pub/Sub backbone, deployed on **GKE** (Kubernetes), provisioned with **Terraform +
> Helm**, shipped by a **CI/CD** pipeline, and load-tested with **Locust**.
>
> Each `## Slide N` heading = one slide. Companion docs:
> `docs/SOFTWARE_ARCHITECTURE.md`, `docs/MILESTONE2_SUBMISSION.md`,
> `docs/MILESTONE2_CHANGELOG.md`, `tests/load/reports/REPORT.md`.

---

## Slide 1 — Title & Agenda

**TravelManager — Cloud-Native Social Travel Platform (B2B SaaS)**
7 microservices + Nuxt 3 frontend · GCP Pub/Sub async backbone · GKE Autopilot ·
Terraform + Helm IaC · GitHub Actions CI/CD · Locust load tests.

*Team:* Kai Cikoglu · Nina Karl · Johanna Prinz · Daniel Rill
*Repo:* github.com/cikoglukai/TravelManager

**Agenda**
1. Problem & SaaS model  2. From M1 to M2  3. Architecture overview  4. The four
functional areas  5. API Gateway & tenancy  6. Trip Management  7. Social (async feed)
8. Travel Information (pollers + diff)  9. Destination Management (B2B)
10. Async backbone (Pub/Sub)  11. Workflow control  12. Data: DB-per-service
13. 12-Factor mapping  14. Kubernetes / Helm  15. Terraform IaC  16. CI/CD pipeline
17. Performance testing  18. Results  19. Security & limitations  20. Demo + Q&A

---

## Slide 2 — Problem & the SaaS model

**Problem.** A travel app that not only plans trips but keeps a social layer alive
*and* actively protects travellers from danger affecting their booked trips — sold to
businesses, not just consumers.

**B2B SaaS, three plans** (`packages/shared/tiers.js`, enforced at the gateway):

| Plan | Price | SLA | Customisation | Extra features |
|------|-------|-----|---------------|----------------|
| Free | none | best effort | none | core trip planning |
| Standard | paid | yes | white-labelling (logo, colour, domain) | + personalized feed, newsletter |
| Enterprise | premium | yes | highly customisable | + B2B destination data access |

This milestone implements the **Standard** solution across four functional areas, plus
the production cloud-native concerns (microservices, async, Kubernetes, IaC, perf).

---

## Slide 3 — From Milestone 1 to Milestone 2

**M1 was** a single Nuxt 3 monolith (SPA + Nitro API in one process) on Postgres +
Firebase. A LikeC4 doc *described* a 7-service SaaS — but nothing was built.

**M2 is** that blueprint, running:
- 7 microservices + the Nuxt frontend
- a **Pub/Sub** asynchronous backbone (events, not request-path work)
- **one database per service**
- on **GKE Autopilot**, via **Helm + Terraform**
- with a **GitHub Actions CI/CD** pipeline

The old monolith has been removed; its git history is the reference. The earlier IaaS
(`terraform_iaas/`) and Cloud Run (`terraform/`) stacks are kept as the
deployment-model performance baseline.

---

## Slide 4 — Architecture overview

```
              Traveller / Business (browser)
                          │
                          ▼
                  ┌────────────────┐  JWT verify · tenant/plan resolve
                  │  API Gateway   │  rate limit · feature gate · inject identity
                  └───┬────────────┘
        ┌─────────────┼────────────┬──────────────┬───────────────┐
        ▼             ▼            ▼              ▼               ▼
   user-service  trip-service  destination   social-service  travel-info-service
     (sync)        (sync)      -service(sync)   (async)         (async)
        │  DB         │ DB          │ DB           │ DB             │ DB
        │             │ publish     │              ▲ subscribe      │ publish
        │             └─► Pub/Sub: TripCreated/TripUpdated ─────────┤
        │                  TravelAlert ◄───────────────────────────┘
        │                  NewsletterReady ◄── social newsletter job
        │                         │ subscribe
        │                         ▼
        │                 notification-service ──► SendGrid (email)
        └─ tenant/plan lookups (gateway, notification)
```

Synchronous services answer requests; **asynchronous workers** consume domain events.
Full C4 model in `docs/architecture/` (LikeC4, auto-published to GitHub Pages).

---

## Slide 5 — The four functional areas

| Area | Service | What it does |
|------|---------|--------------|
| **Trip Management** | `trip-service` | trips, plan locations, travel plans, reviews, likes, live RapidAPI flight/hotel/bus search; publishes `TripCreated/Updated` |
| **Social** | `social-service` | personalized live **feed** built from trip events over a follow graph; weekly **newsletter** |
| **Travel Information** | `travel-info-service` | poll official **travel warnings** + **weather**, diff vs active trips, raise `TravelAlert` |
| **Destination Management** | `destination-service` | destination/route catalog + **B2B data API** (anonymized traveller marketing data, Enterprise only) |

Supporting: `user-service` (profiles/tenants/plans), `notification-service`
(email out), `api-gateway` (single entry), `frontend` (Nuxt 3 SPA).
`packages/shared/` = cross-cutting library (DB pool, Firebase, identity, Pub/Sub, tiers).

---

## Slide 6 — API Gateway & multi-tenancy

**Single front door** — all client traffic enters `api-gateway`. It is the only place
that:
1. Verifies the **Firebase JWT** (Firebase Admin lives here, nowhere else).
2. Resolves **tenant + plan** for the user.
3. Applies **per-plan rate limits** and **feature gating** (`packages/shared/tiers.js`).
4. Injects trusted identity headers downstream: `x-user-uid`, `x-tenant-id`,
   `x-plan`, `x-role`.
5. Routes by path (`/api/trips` → trip-service, …).

**Trust model.** Downstream services trust the gateway-injected headers and are
reachable *only* from inside the cluster (Kubernetes **NetworkPolicies**) — they never
re-verify the JWT. White-label config (logo/colour/domain) lives in the User DB
`tenants` table.

---

## Slide 7 — Trip Management (`trip-service`)

The Milestone-1 trip features, retained as the hygiene baseline and extended:
- Trips, plan locations, travel plans (template + custom-plan wizard).
- Reviews — star ratings in **Postgres**, comments in **Firestore**.
- Likes (Firestore).
- Live **RapidAPI** flight / hotel / bus search.

**Key M2 extension:** destinations are **geocoded on write**
(`packages/shared/geocode.js`, Google Geocoding with Open-Meteo fallback) — the country
is needed so Travel Information can match warnings to trips. On every create/update the
service **publishes `TripCreated` / `TripUpdated`** to Pub/Sub, feeding the social feed
and the warning diff engine.

---

## Slide 8 — Social Interaction (`social-service`, async)

Implemented as a **separate microservice** with an **asynchronous** core.

**Personalized live feed.** A `feedConsumer` subscribes to `TripCreated`/`TripUpdated`,
**fans each event out across the follow graph** into `feed_entries`, scored for
relevance. Served read-side by `GET /api/feed`. Fan-out is the large-dataset workload —
it runs off the request path.

**Follow graph.** `GET/POST/DELETE /api/feed/follows[/uid]`.

**Newsletter.** A weekly **CronJob** triggers a job that publishes `NewsletterReady`;
notification-service turns it into email. Both feed + newsletter are **Standard-plan**
gated features.

---

## Slide 9 — Travel Information (`travel-info-service`, async)

The "protect the traveller" service.

- **Pollers (CronJobs):** fetch official **travel warnings** from *Auswärtiges Amt*
  open data, and **weather** from *Open-Meteo* (both keyless).
- **Diff engine:** matches warnings against **active trips** (whole-word country match)
  and **publishes `TravelAlert`**.
- `GET /api/alerts` feeds the SPA `AlertBanner.vue`; notification-service emails the
  alert.

Warnings are high priority (natural disasters, unrest); weather is value-added, lower
priority — exactly the assignment's ordering.

---

## Slide 10 — Destination Management (`destination-service`)

- **Catalog:** destinations + routes; hydrates plan-refs for template travel plans
  (called over HTTP by trip-service — no cross-service DB foreign keys).
- **B2B data API:** `GET /api/b2b/destinations/:id/travelers` returns **aggregated,
  anonymized** traveller marketing data.
- **Access control:** restricted to **Enterprise** tenants holding the
  `destinationMgr` role — enforced from the gateway-injected `x-plan` / `x-role`.

This is the "sell services at the destination + give destinations marketing data"
requirement, gated to the premium plan.

---

## Slide 11 — Asynchronous backbone (Pub/Sub)

**Why async.** Feed fan-out, warning diffing across all trips, newsletter, and email
are large / slow. Doing them in the request path would block users and prevent
independent scaling. They run as **events**.

**Topics:** `TripCreated`, `TripUpdated`, `TravelAlert`, `NewsletterReady`.

| Publisher | Topic | Consumer |
|-----------|-------|----------|
| trip-service | TripCreated / TripUpdated | social (feed build), travel-info (diff) |
| travel-info | TravelAlert | notification (email) |
| social | NewsletterReady | notification (email) |

**Reliability.** Every topic has a **dead-letter topic** + **capped delivery attempts**
(`max_delivery_attempts = 5`, `terraform_gke/pubsub.tf`). Poison messages (unparseable
JSON) are **ack-dropped**, not redelivered forever.

---

## Slide 12 — Workflow control mechanisms

The assignment requires *control mechanisms* for async workflows. Every worker exposes:

- **`GET /api/control`** — processed counts, last-run timestamp, lag.
- **pause / resume** — `control/[worker]/pause.post.js` + `resume.post.js`
  (travel-info-service).

Files:
```
services/travel-info-service/api/control/index.get.js
services/travel-info-service/api/control/[worker]/pause.post.js
services/travel-info-service/api/control/[worker]/resume.post.js
services/social-service/api/control/index.get.js
services/notification-service/api/control/index.get.js
```

Scheduled work runs as Kubernetes **CronJobs** that POST to the owning service's task
endpoint (`/api/tasks/poll-warnings`, `/api/tasks/newsletter`, …).

---

## Slide 13 — Data: one database per service

**Database-per-service (12-Factor boundary).** Each service owns its schema. A single
Cloud SQL **Postgres 16** instance hosts **one logical database per service** — keeps
the boundary while billing one instance (a documented cost trade-off).

**No cross-service hard foreign keys:**
- author / reviewer display names are **denormalized at write time**;
- template travel plans hydrate destination data **over HTTP** to destination-service.

Firestore holds the social signal layer (review comments + likes) — high write fan-out,
simple counters, public read scaling — while Postgres holds relational data.

---

## Slide 14 — 12-Factor mapping

| Factor | Implementation |
|--------|----------------|
| I Codebase | one monorepo, npm workspaces; one deployable per service |
| II Dependencies | per-service `package.json`; Nitro bundles output |
| III Config | all config via env; secrets in GCP Secret Manager (via ESO) |
| IV Backing services | Cloud SQL, Pub/Sub, Firestore, SendGrid as attached resources |
| V Build/release/run | CI builds images → Artifact Registry → Helm release |
| VI Processes | stateless services; state in Postgres / Firestore |
| VII Port binding | each service binds `NITRO_PORT` (8080) |
| VIII Concurrency | scale-out via Deployments + HPA; workers scale independently |
| IX Disposability | fast boot (non-blocking schema bootstrap), graceful probes |
| X Dev/prod parity | same images locally (`docker-compose.dev.yml` / kind) and on GKE |
| XI Logs | structured stdout → Cloud Logging |
| XII Admin processes | schema bootstrap on start; CronJobs for scheduled tasks |

---

## Slide 15 — Kubernetes / Helm (`k8s/travelmanager`)

The Helm chart renders, per environment:
- **Deployment + Service + HPA** per sync service (autoscale on load).
- Worker **Deployments** (scale independently of the sync tier).
- **CronJobs** — pollers + newsletter.
- **GKE Ingress** — managed TLS + static IP; routes `/api` → gateway, `/` → frontend.
- **Cloud SQL Auth Proxy** sidecar.
- Secrets via **External Secrets Operator** from Secret Manager.
- **Workload Identity** for keyless GCP access.
- **NetworkPolicies** — downstream services reachable only from TravelManager pods.

**Dual-mode chart:** `values-local.yaml` runs the whole stack on **kind/minikube**
(in-cluster Postgres, plain Secrets, nginx ingress, `PUBSUB_DISABLED=1`) — dev/prod
parity from one chart.

---

## Slide 16 — Terraform IaC (`terraform_gke/`)

End-to-end provisioning, no manual clicking for the core resources:
- **GKE Autopilot** cluster + reserved static **Ingress IP**.
- **Artifact Registry** repo.
- **Cloud SQL Postgres 16** + 6 per-service databases + per-service `DATABASE_URL`
  secrets.
- Full **Pub/Sub** topology — topics + subscriptions + **DLQs** + service-agent IAM.
- Runtime **service account + IAM** + **Workload Identity** binding.
- **Secret Manager** secrets (RapidAPI, SendGrid, Firebase SA, Maps server key).

A small, documented set of one-time **console** steps (Maps API keys, Firebase project,
WIF pool, ESO install, DNS) is listed in `MILESTONE2_SUBMISSION.md` §9.

---

## Slide 17 — CI/CD pipeline (`.github/workflows/deploy.yml`)

On push to `main`:
1. **Test** — compile-check all services.
2. **Build & push** — 8 images → Artifact Registry, tagged `$GITHUB_SHA` + `latest`.
3. **Deploy** — `helm upgrade --install` to GKE.

Authentication uses **Workload Identity Federation** — **no JSON service-account keys**
stored in GitHub. This is 12-Factor build/release/run automated end-to-end.

---

## Slide 18 — Performance testing (Locust)

Harness in `tests/load/` (`locustfile.py`). Two user classes: `BrowsingUser`
(anonymous, weight 3) + `AuthedUser` (real Firebase `signInWithPassword`, weight 1).

**Load shapes** (`tests/load/shapes/`):
- **periodic** — 4 cycles, 20 ↔ 100 users (stresses autoscaling cooldown).
- **spike** — burst 10 → 500 users (once-in-a-lifetime workload).

**Scalability test datasets (for the top grade):**
- `seed_bulk_trips.py` — generates large trip volumes.
- `async_flood.py` — floods `TripCreated` to exercise the async pipeline (feed build +
  warning diff).
- `fixtures/warnings.json` + a `seed-warnings` endpoint — deterministic diff input.

Worker scale-out observed via `kubectl get hpa` + the per-worker `/api/control`.

---

## Slide 19 — Results (deployment-model baseline)

Real Locust aggregates (`tests/load/reports/`, full report in `REPORT.md`):

| Scenario · target | Median | p95 | p99 | RPS | Fail % |
|---|---|---|---|---|---|
| Periodic · Cloud Run | 55 ms | 140 ms | 220 ms | 25.2 | 0.53% |
| Periodic · IaaS VM | 71 ms | 350 ms | 650 ms | 10.8 | 0.31% |
| Spike · IaaS VM | 140 ms | 1.7 s | 5.1 s | 84.2 | 0.09% |
| Spike · Cloud Run | 160 ms | 2.1 s | 5.6 s | 82.8 | 0.10% |
| 2000-user · IaaS | 530 ms | 58 s | 110 s | 35.6 | 0.08% |
| 2000-user · Cloud Run | 690 ms | 87 s | 146 s | 23.6 | 1.41% |

**Findings.** Autoscaling (Cloud Run) keeps the periodic tail tight; the single VM
saturates at peak. Both survive the 500-user spike (<0.2% fail) but Cloud Run pays
cold-start during the ramp. At 2000 users both pass their practical ceiling.
GKE microservice autoscaling under `async_flood` is confirmed via HPA + `/api/control`.

---

## Slide 20 — Security, limitations, demo & Q&A

**Security model**
- Only the gateway verifies Firebase JWTs; downstream trusts injected identity.
- Downstream services reachable only in-cluster (NetworkPolicies).
- Secrets in Secret Manager via ESO; **no keys in image / git**; Workload Identity
  (keyless) for both runtime and CI.
- Cloud SQL via Auth Proxy (no public DB IP); B2B data is aggregated + anonymized.

**Known limitations** (honest)
- User rename doesn't propagate to denormalized names (needs a `UserRenamed` event).
- Rate limiter is per-replica in-memory (Redis needed for true multi-replica SLA).
- GKE-specific latency table is future work; the IaaS/PaaS comparison is the submitted
  quantitative baseline.

**Demo checklist:** sign in → create trip (publishes event) → see it in the personalized
feed → seed a warning → receive a TravelAlert → show `/api/control` + `kubectl get hpa`
scaling under `async_flood`.

**Q&A topics.** Microservice boundaries · async + control · 12-Factor · GKE/Helm ·
Terraform IaC · CI/CD · performance.
