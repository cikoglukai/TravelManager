# TravelManager — Cloud Native Project Documentation

**Course:** Cloud Application Development — Summer Term 2026, Prof. Dr. Markus Eiglsperger
**Team:** Kai Cikoglu · Nina Karl · Johanna Prinz · Daniel Rill
**Repository:** https://github.com/cikoglukai/TravelManager
**Live application:** https://onecloudaway.de (GKE Autopilot, region `europe-west1`)

> This is the **single rubric-aligned deliverable**. Its section numbers match the
> assignment 1:1 (1 Requirements → 4 Performance Tests) so it doubles as the
> **presentation source**. Companion documents (kept for depth):
> `SOFTWARE_ARCHITECTURE.md`, `MILESTONE2_SUBMISSION.md`, `MILESTONE2_CHANGELOG.md`,
> `DEPLOYMENT_GKE.md`, `architecture/` (LikeC4), `../tests/load/reports/`.
>
> Schema/scaling/role details below are taken verbatim from the code
> (`services/*/utils/schema.js`, `k8s/travelmanager/values.yaml`,
> `packages/shared/tiers.js`, `terraform_gke/iam.tf`).

---

# 1. Requirements

TravelManager is a **social travel-planning platform offered as a B2B SaaS** product.
It plans trips, surfaces them in a personalized social feed, actively warns travellers
about danger/weather affecting their booked trips, and sells anonymized traveller data
to destinations. Sold on three plans — **Free / Standard / Enterprise** — each
unlocking more features. The system is built as **7 microservices + a Nuxt 3
frontend** with an **asynchronous Pub/Sub backbone**, running on **GKE Autopilot**,
provisioned entirely with **Terraform + Helm** and shipped by **GitHub Actions CI/CD**.

## 1.1 System Context

```
                            ┌───────────────────────────────────────────────┐
        Actors              │                 TravelManager                  │      External systems
                            │            (GKE Autopilot cluster)             │
  ┌──────────────┐         │                                                │     ┌────────────────────┐
  │ Traveller    │──HTTPS──▶│  Ingress (TLS) ─▶ API Gateway ─▶ 7 services    │────▶│ Firebase Auth       │ JWT verify
  │ (end user)   │         │                                                │     ├────────────────────┤
  ├──────────────┤         │                                                │────▶│ Firestore           │ comments, likes
  │ Business /   │──HTTPS──▶│                                                │     ├────────────────────┤
  │ B2B customer │         │                                                │────▶│ Cloud SQL (Postgres)│ relational data
  ├──────────────┤         │                                                │     ├────────────────────┤
  │ Destination  │──HTTPS──▶│                                                │────▶│ GCP Pub/Sub         │ async events
  │ manager      │         │                                                │     ├────────────────────┤
  ├──────────────┤         │                                                │────▶│ RapidAPI            │ flights/hotels/buses
  │ Operator /   │──kubectl─▶│                                                │     ├────────────────────┤
  │ CI pipeline  │         │                                                │────▶│ Google Maps/Geocode │ places, geocoding
  └──────────────┘         │                                                │     ├────────────────────┤
                            │                                                │◀───▶│ Auswärtiges Amt API │ travel warnings (keyless)
                            │                                                │◀───▶│ Open-Meteo API      │ weather (keyless)
                            │                                                │────▶│ SendGrid            │ email out
                            └───────────────────────────────────────────────┘     └────────────────────┘
```

**Actors**
| Actor | Interaction |
|---|---|
| **Traveller** | Browser (Nuxt SPA over HTTPS) — plans/shares trips, sees feed + alerts |
| **Business / B2B customer (tenant)** | Buys a plan; white-labels the app; owns its users |
| **Destination manager** | Enterprise role (`destinationMgr`); reads aggregated B2B traveller data |
| **Operator / CI pipeline** | GitHub Actions (WIF) → builds + `helm upgrade`; ops via `kubectl` |

**External interfaces / neighboring systems**
| System | Type | Used for | Auth |
|---|---|---|---|
| Firebase Authentication | external auth | login, JWT issuance/verify | Firebase Admin (gateway only) |
| Cloud Firestore | external datastore | review comments, likes | Workload Identity / SA |
| Cloud SQL (Postgres 16) | managed datastore | all relational data | Cloud SQL Auth Proxy + IAM |
| GCP Pub/Sub | messaging | async events (4 topics + DLQs) | runtime SA (pub/sub roles) |
| RapidAPI (Sky Scrapper, Booking.com) | external API | live flight/hotel/bus search | `RAPIDAPI_KEY` (optional) |
| Google Maps JS + Geocoding | external API | map/places (browser), geocode (server) | 2 keys (browser + server) |
| Auswärtiges Amt open data | external API | official travel warnings | keyless |
| Open-Meteo | external API | weather | keyless |
| SendGrid | external API | alert + newsletter email | `SENDGRID_API_KEY` (optional) |

Rendered C4 (context + container) is auto-published from `architecture/workspace.dsl`
(LikeC4) to GitHub Pages.

## 1.2 Feature Overview

| Area | Service | Features |
|---|---|---|
| **Trip Management** | `trip-service` | trips w/ multi-stop plan locations + dates, travel plans (template + custom wizard), reviews (stars in Postgres, comments in Firestore), likes; geocode-on-write; live RapidAPI flight/hotel/bus search; publishes `TripCreated/Updated` |
| **Social Interaction** | `social-service` | personalized **live feed** (async fan-out over follow graph), follow graph, weekly **newsletter** |
| **Travel Information** | `travel-info-service` | scheduled pollers (travel warnings + weather), **diff engine** matching warnings to active trips, raises `TravelAlert` |
| **Destination Management** | `destination-service` | destination/route catalog + transport/accommodation options, plan-ref hydration, **B2B data API** (aggregated, anonymized traveller marketing data) |

**SaaS plans** (`packages/shared/tiers.js`, enforced at the gateway):

| Plan | rateLimitPerMin | feed | newsletter | whiteLabel | b2bData |
|---|---|---|---|---|---|
| Free | 60 | – | – | – | – |
| Standard | 600 | ✅ | ✅ | ✅ | – |
| Enterprise | 6000 | ✅ | ✅ | ✅ | ✅ |

Default tenant plan: `standard` (seeded `default` tenant). Default user role: `traveler`.

## 1.3 Domain Model

Main business entities, their owning service/DB, relationships, and key attributes.
Cross-service relationships (dashed) are **logical references only** — no hard FK
crosses a service boundary (DB-per-service); display names are denormalized at write
time and template plans hydrate over HTTP. (Table/column names are the actual schema.)

```
   User DB                                  Trip DB
   ┌───────────────┐                        ┌──────────────────────────────────────┐
   │   tenants     │ id(PK), name, plan,    │ trips  id(PK), user_uid⟂, author_name,│
   │               │ logo_url, brand_color, │        title, destination, origin,    │
   │               │ custom_domain          │        start_date, short_description, │
   └──────┬────────┘                        │        detail_description, dest_lat,  │
          │ 1 (tenant_id)                   │        dest_lng, dest_country,         │
          │ *                               │        like_count                     │
   ┌──────▼────────┐                        └───┬───────────┬───────────┬───────────┘
   │    users      │ firebase_uid(PK),        1*│         1*│         1* │ (1:1)
   │  email, name, bio, home_city,            ┌─▼────────┐ ┌▼────────┐ ┌▼──────────────┐
   │  avatar_url, tenant_id, role='traveler'  │plan_     │ │reviews  │ │ travel_plans  │
   └───────────────┘                          │locations │ │trip_id, │ │ trip_id(UQ),  │
          ⟂ (uid logical refs everywhere)     │trip_id,  │ │reviewer_│ │ mode, dest_id↘,│
                                              │name,lat, │ │id,      │ │ route_id↘,     │
                                              │lng,day-  │ │reviewer_│ │ transport_opt↘,│
                                              │from/to,  │ │name,    │ │ accom_opt↘,    │
                                              │position, │ │stars 1-5│ │ notes,         │
                                              │category  │ │UQ(trip, │ │ custom_* (15)  │
                                              └──────────┘ │reviewer)│ └──────╎────────┘
                                                           └─────────┘        ╎ logical IDs
   Destination DB                                                             ╎ (hydrate over HTTP)
   ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────────┐
   │ destinations │1*│   routes     │1*│ transport_options  │  │ accommodation_options│
   │ id, country, │  │ id, dest_id, │  │ id, route_id, type,│  │ id, route_id, type,  │
   │ city(UQ pair)│  │ name(UQ),    │  │ provider, duration,│  │ name, price_per_night,│
   │ emoji, descr │  │ description, │  │ price_from, notes  │  │ rating, notes        │
   └──────────────┘  │ duration_days│  └────────────────────┘  └──────────────────────┘
                     │ highlights   │
                     └──────────────┘

   Social DB                              Travel-Info DB                       Notification DB
   ┌──────────┐ ┌────────────────┐        ┌────────────────┐ ┌─────────────┐  ┌──────────────────┐
   │ follows  │ │ feed_entries   │        │ warnings_cache │ │ weather_    │  │ notification_log │
   │ follower_│ │ id, user_uid⟂, │        │ id, country_   │ │ cache       │  │ id, user_uid⟂,   │
   │ uid,     │ │ trip_id⟂,      │        │ code(UQ),      │ │ id,city(UQ),│  │ kind, subject,   │
   │ followee_│ │ author_uid,    │        │ country_name,  │ │ summary,    │  │ delivered, ts    │
   │ uid (PK  │ │ author_name,   │        │ warning,partial│ │ max_temp,   │  └──────────────────┘
   │ pair)    │ │ title, dest,   │        │ severity,title,│ │ min_temp    │
   └──────────┘ │ score          │        │ content_hash   │ └─────────────┘
                │ UQ(user,trip)  │        └────────────────┘ ┌────────────────────────────────┐
                ├────────────────┤                           │ alert_log id, trip_id⟂, user_  │
                │ newsletter_log │                           │ uid⟂, kind, country, severity, │
                │ user_uid, ts   │                           │ title, content_hash UQ(trip,   │
                └────────────────┘                           │ content_hash)                  │
                                                             └────────────────────────────────┘

   Firestore (NoSQL, social signal layer):  review comments {tripId, uid, text, ts}   likes {tripId, uid}
```

**Key relationships**
- `tenants 1—* users` (`users.tenant_id`) — the only hard FK pair, both in User DB.
- `trips 1—* {plan_locations, reviews}` and `trips 1—1 travel_plans` (FK, Trip DB,
  `ON DELETE CASCADE`).
- `destinations 1—* routes 1—* {transport_options, accommodation_options}` (FK, Destination DB).
- `follows` = many-to-many self-relation on user (composite PK `follower_uid, followee_uid`).
- All **⟂ / dashed** links (`user↔trips`, `trips↔feed_entries`, `trips↔alert_log`,
  `travel_plans↔destinations/routes/options`) are **logical** — plain
  `user_uid`/`trip_id`/`*_id` columns, enforced in application code, not the database.

---

# 2. Runtime View

## 2.1 Runtime Overview

**Live environment**
| | |
|---|---|
| Live app | https://onecloudaway.de |
| GCP project | `project-59d9fc88-ac5c-43c3-894` |
| Region | `europe-west1` |
| GKE cluster | `travelmanager-gke` (Autopilot) |
| Static ingress IP | `8.232.102.95` |
| Artifact Registry | `europe-west1-docker.pkg.dev/<PROJECT>/travelmanager` |
| Cloud SQL | `<PROJECT>:europe-west1:travelmanager-pg-gke` (Postgres 16) |

**Cloud resource diagram (runtime)**

```
Internet
   │ HTTPS (Google-managed cert)
   ▼
GKE Ingress (ingress-gce, static IP travelmanager-ip, host onecloudaway.de)
   │  /api → api-gateway      / → frontend
   ▼
┌──────────────────────────── GKE Autopilot (namespace default) ─────────────────────────────┐
│  sync tier (Deployment+Service+HPA):                                                          │
│     frontend (HPA 2–6)  api-gateway (HPA 2–10, public)  user (2–8)  trip (2–10)  dest (2–6)   │
│  async tier (workers): social (2 replicas)  travel-info (HPA 2–6)  notification (2 replicas)  │
│  CronJobs: poll-warnings (hourly), poll-weather (every 6h), newsletter (Mon 08:00)            │
│  each app pod: + Cloud SQL Auth Proxy sidecar ; KSA `travelmanager` (Workload Identity)       │
│  NetworkPolicies: downstream reachable only from part-of=travelmanager pods                   │
│  ExternalSecrets ← ClusterSecretStore `gcp-secret-store`                                      │
└──────────┬───────────────┬───────────────┬───────────────┬───────────────┬──────────────────┘
           ▼               ▼               ▼               ▼               ▼
        Cloud SQL       Pub/Sub        Secret Mgr       Firestore        SendGrid / RapidAPI
        (6 logical DBs) (4 topics+DLQ) (keys)           (comments,likes) Maps/Geocode (external)
```

**Cloud resource configuration**
- **API Gateway** — the only public app service (`replicas 2`, HPA `min 2 / max 10`,
  target CPU **70%**). Verifies Firebase JWT, resolves tenant+plan, applies per-plan
  rate limits + feature gates (`tiers.js`), injects `x-user-uid / x-tenant-id / x-plan
  / x-role`, routes by path to the 6 internal services. Hand-rolled fetch proxy
  (`api-gateway/utils/proxy.js`) — strips hop-by-hop headers, reads service URLs from
  `process.env` at request time. Health: `/healthz`.
- **Ingress** — GKE ingress-gce via `kubernetes.io/ingress.class: gce` annotation,
  reserved static IP `travelmanager-ip`, Google-managed TLS cert `travelmanager-cert`
  (or `preSharedCert` to reuse an ACTIVE cert), host `onecloudaway.de`, routes
  `/api`→gateway, `/`→frontend.
- **Cloud SQL** — Postgres 16, reached via the Auth Proxy sidecar (no public DB IP).
- **Pub/Sub** — 4 topics, each with a dead-letter topic + `max_delivery_attempts = 5`.

**Synchronous vs asynchronous**
- **Synchronous** (request/response): `frontend`, `api-gateway`, `user`, `trip`,
  `destination` — Deployment + Service + HPA, answer the user in the request path.
  DB services expose `/api/health` (liveness) + `/api/ready` (503 until schema
  bootstrapped).
- **Asynchronous** (workers): `social`, `travel-info`, `notification` — consume Pub/Sub
  events (`createSubscriber` pull or `/api/events/*` push) off the request path; the
  large-dataset work (feed fan-out, warning diff, email) runs here and scales
  independently. Scheduled triggers are Kubernetes **CronJobs** that POST to the owning
  service's `/api/tasks/*` endpoint.

## 2.2 Microservices

Every service is a standalone **Nitro (Node.js)** app, one container, port **8080**,
config 100% via env, schema bootstrapped non-blocking on start. Pod resources:
requests `100m / 192Mi`, limits `500m / 512Mi`.

| Service | Sync/Async | Runtime config | Scaling (from `values.yaml`) | Security | External cloud connections |
|---|---|---|---|---|---|
| **api-gateway** | sync, public | service URLs via env (request-time); `FIREBASE_SERVICE_ACCOUNT` | **HPA 2–10**, CPU 70% (auto) | only JWT verifier; injects identity; per-plan rate limit; open-ingress NetworkPolicy | Firebase Auth |
| **user-service** | sync | `DATABASE_URL` (user DB) | **HPA 2–8**, CPU 70% (auto) | in-cluster only; trusts gateway headers | Cloud SQL (user DB) |
| **trip-service** | sync | `DATABASE_URL`, `RAPIDAPI_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `FIREBASE_SERVICE_ACCOUNT` (ESO) | **HPA 2–10**, CPU 70% (auto) | in-cluster only; secrets via ESO/WI | Cloud SQL (trip DB), RapidAPI, Google Geocoding, Pub/Sub (publish), Firestore (comments/likes) |
| **destination-service** | sync | `DATABASE_URL` (destination DB) | **HPA 2–6**, CPU 70% (auto) | in-cluster only; B2B endpoint gated Enterprise+`destinationMgr` | Cloud SQL (destination DB) |
| **social-service** | async | `DATABASE_URL` (social DB) | **2 replicas (fixed, no HPA)** | in-cluster only | Cloud SQL (social DB), Pub/Sub (sub TripCreated/Updated, pub NewsletterReady) |
| **travel-info-service** | async | `DATABASE_URL` (travelinfo DB) | **HPA 2–6**, CPU 70% (auto) | in-cluster only | Cloud SQL (travelinfo DB), Pub/Sub (pub TravelAlert), Auswärtiges Amt, Open-Meteo |
| **notification-service** | async | `DATABASE_URL`, `SENDGRID_API_KEY` | **2 replicas (fixed, no HPA)** | in-cluster only | Cloud SQL (notification DB), Pub/Sub (sub TravelAlert/NewsletterReady), SendGrid |
| **frontend** | sync, public | `NUXT_PUBLIC_*` via `global.extraEnv` | **HPA 2–6**, CPU 70% (auto) | public client config only; no secrets | — (calls gateway) |

**Scaling** — the sync tier + travel-info worker autoscale by **HPA on CPU 70%**;
`social-service` and `notification-service` run at a **fixed 2 replicas**. Sync and
async tiers scale independently. Autopilot provisions nodes automatically (no node-pool
management).

**Security setup** — only the gateway verifies the Firebase JWT; downstream services
**never re-verify** and are reachable **only inside the cluster** via NetworkPolicies
(selector `app.kubernetes.io/part-of: travelmanager`). Inter-service trust rides on
gateway-injected `x-user-*` headers. Secrets come from Secret Manager via ESO; pods
authenticate to GCP keylessly via Workload Identity.

**Multi-tenancy isolation** — tenancy is **logical (shared-instance, row-level)**, a
deliberate cost trade-off:
- Each user carries `tenant_id`; the gateway resolves **plan** per request and injects
  `x-tenant-id` / `x-plan` / `x-role`.
- **Feature gating + per-plan rate limits** are enforced centrally (`tiers.js`): feed +
  newsletter + whiteLabel = Standard+, b2bData = Enterprise + `destinationMgr` role.
- White-label config (logo_url / brand_color / custom_domain) is per-tenant in the
  `tenants` table.
- B2B traveller data is returned **aggregated + anonymized** only.
- *Honest limitation:* services share one Cloud SQL instance (one logical DB per
  service, not per tenant); isolation is enforced in application logic, not by
  separate per-tenant schemas/instances.

## 2.3 Datastores

| Storage | Type | Owner | Tables | Isolation |
|---|---|---|---|---|
| **user DB** | Postgres (logical) | user-service | `tenants`, `users` | row-level by tenant_id |
| **trip DB** | Postgres (logical) | trip-service | `trips`, `plan_locations`, `reviews`, `travel_plans` | row-level by user_uid |
| **destination DB** | Postgres (logical) | destination-service | `destinations`, `routes`, `transport_options`, `accommodation_options` | shared catalog (not tenant data) |
| **social DB** | Postgres (logical) | social-service | `follows`, `feed_entries`, `newsletter_log` | row-level by user_uid |
| **travelinfo DB** | Postgres (logical) | travel-info-service | `warnings_cache`, `weather_cache`, `alert_log` | alert_log row-level by user_uid; caches shared |
| **notification DB** | Postgres (logical) | notification-service | `notification_log` | by user_uid |
| **Firestore** | NoSQL | trip-service | review comments, likes | by tripId/uid |

All six Postgres logical databases live on **one Cloud SQL Postgres 16 instance**
(`travelmanager-pg-gke`) — DB-per-service boundary preserved while billing one
instance (documented cost trade-off). No hard FK crosses a database.

**Data model (per storage) — actual DDL:**

```
-- user DB
tenants(id PK TEXT, name, plan DEFAULT 'free', logo_url, brand_color, custom_domain, created_at)
        -- seeded row: ('default','TravelManager','standard')
users(firebase_uid PK, email UNIQUE, name, bio, home_city, avatar_url,
      tenant_id DEFAULT 'default', role DEFAULT 'traveler', created_at)

-- trip DB
trips(id SERIAL PK, user_uid, author_name, title, destination, origin, start_date TEXT,
      short_description, detail_description, dest_lat, dest_lng, dest_country,
      like_count, created_at)                                   -- INDEX(user_uid)
plan_locations(id SERIAL PK, trip_id→trips ON DELETE CASCADE, name, description, image_url,
      latitude, longitude, date_from, date_to, position, category DEFAULT 'other', created_at)
reviews(id SERIAL PK, trip_id→trips ON DELETE CASCADE, reviewer_id, reviewer_name,
      stars CHECK 1–5, created_at, updated_at, UNIQUE(trip_id, reviewer_id))
travel_plans(id SERIAL PK, trip_id→trips ON DELETE CASCADE UNIQUE, mode DEFAULT 'template',
      destination_id, route_id, transport_option_id, accommodation_option_id, notes,
      custom_* (15 cols: destination/route/duration/transport/accommodation), created_at, updated_at)

-- destination DB (static catalog, seeded on start)
destinations(id SERIAL PK, country, city, emoji, description, UNIQUE(country, city))
routes(id SERIAL PK, destination_id→destinations ON DELETE CASCADE, name, description,
      duration_days, highlights, UNIQUE(destination_id, name))
transport_options(id SERIAL PK, route_id→routes ON DELETE CASCADE, type, provider, duration,
      price_from, notes)
accommodation_options(id SERIAL PK, route_id→routes ON DELETE CASCADE, type, name,
      price_per_night, rating NUMERIC(2,1), notes)

-- social DB
follows(follower_uid, followee_uid, created_at, PRIMARY KEY(follower_uid, followee_uid))
feed_entries(id SERIAL PK, user_uid, trip_id, author_uid, author_name, title, destination,
      score, created_at, UNIQUE(user_uid, trip_id))   -- INDEX(user_uid, score DESC, created_at DESC)
newsletter_log(id SERIAL PK, user_uid, entry_count, created_at)

-- travelinfo DB (caches + dedup log)
warnings_cache(id SERIAL PK, country_code UNIQUE, country_name, warning BOOL, partial BOOL,
      severity DEFAULT 'none', title, content_hash, updated_at)
weather_cache(id SERIAL PK, city UNIQUE, summary, max_temp, min_temp, updated_at)
alert_log(id SERIAL PK, trip_id, user_uid, kind DEFAULT 'warning', country, severity, title,
      content_hash, created_at, UNIQUE(trip_id, content_hash))   -- INDEX(user_uid)

-- notification DB (audit of what was sent)
notification_log(id SERIAL PK, user_uid, kind, subject, delivered BOOL, created_at)

-- Firestore (NoSQL JSON)
review comments: { tripId, uid, text, createdAt }    likes: { tripId, uid }
```

## 2.4 Security: Roles and Role Mapping

**GCP service accounts** (`terraform_gke/iam.tf` + runbook)
| Identity | Type | Roles / privileges | Used by |
|---|---|---|---|
| `travelmanager-gke@…` (runtime GSA) | GCP SA | `cloudsql.client`, `secretmanager.secretAccessor`, `pubsub.publisher`, `pubsub.subscriber`, `datastore.user`, `logging.logWriter`, `monitoring.metricWriter` | all workload pods, via Workload Identity |
| KSA `default/travelmanager` | Kubernetes SA | bound to runtime GSA via `roles/iam.workloadIdentityUser` | every pod (keyless GCP auth) |
| Node default compute SA (`<NUM>-compute@…`) | GCP SA | `roles/artifactregistry.reader` (+ `roles/container.defaultNodeServiceAccount`) | GKE Autopilot nodes (image pull) |
| Deploy SA (CI, WIF) | GCP SA | `artifactregistry.writer`, `container.developer`, secret read | GitHub Actions (no JSON key) |
| Pub/Sub service agent | Google-managed | publisher on DLQ topics, subscriber on subscriptions | Pub/Sub DLQ delivery |

**Application-level roles** (`users.role` + tenant `plan`)
| Role / plan | Capability |
|---|---|
| `traveler` (default) | core app per plan |
| `destinationMgr` | + B2B destination data API (requires Enterprise tenant); assigned via internal `PATCH /api/internal/users/:id` |
| plan `free` / `standard` / `enterprise` | feature + rate-limit envelope (`tiers.js`) |

**Multi-tenancy isolation (security view)** — single authentication point (gateway),
trusted identity headers downstream, NetworkPolicy default-deny to internal services,
keyless Workload Identity, no public DB IP (Cloud SQL Auth Proxy), secrets only in
Secret Manager (never in image/git). Tenant separation is logical/row-level + central
gating (see §2.2). B2B output aggregated + anonymized.

## 2.5 Infrastructure as Code

Two layers, fully reproducible:

1. **Terraform** (`terraform_gke/`) provisions: GKE Autopilot cluster (`gke.tf`),
   Artifact Registry repo, reserved static IP, Cloud SQL Postgres 16 + 6 per-service
   logical DBs + per-service `DATABASE_URL` secrets (`sql.tf`), runtime SA + IAM +
   Workload Identity binding + node-SA image-pull (`iam.tf`), Secret Manager secrets
   (`secrets.tf`), full Pub/Sub topology — topics + subscriptions + DLQs + service-agent
   IAM (`pubsub.tf`). Outputs: `ingress_ip`, `cloud_sql_connection_name`, `gke_runtime_sa`.
2. **Helm chart** (`k8s/travelmanager/`) renders: Deployment+Service+HPA per sync
   service, worker Deployments, CronJobs, GKE Ingress (managed TLS + static IP),
   Cloud SQL Auth Proxy sidecar, ExternalSecrets, ServiceAccount (WI), NetworkPolicies.
   **Dual-mode**: `values-local.yaml` runs the whole stack on kind/minikube (in-cluster
   Postgres, plain Secrets, nginx ingress, `PUBSUB_DISABLED=1`).

**Bring-up:** `terraform apply` → install ESO + create `gcp-secret-store` → push to
`main` (CI builds + `helm upgrade`). Full step list + the small set of manual console
steps (Maps keys, Firebase, WIF pool, DNS) is in `MILESTONE2_SUBMISSION.md` §9 and
`DEPLOYMENT_GKE.md`.

---

# 3. Development View

## 3.1 Software Components

- **Repository:** https://github.com/cikoglukai/TravelManager — a single **monorepo**
  using **npm workspaces** (`workspaces: ["packages/*", "services/*"]`).
- **Organization:**
  - `services/<name>/` — one standalone Nitro app per microservice (`api/` routes,
    `middleware/identity.js`, `utils/` incl. `schema.js`, `plugins/`, `nitro.config.ts`).
  - `packages/shared/` — cross-cutting library every service imports: `db.js` (Postgres
    pool), `firebase.js` (Firebase Admin), `identity.js` (gateway-header middleware),
    `pubsub.js` (`publishEvent` / `createSubscriber`), `tiers.js` (plans + gates),
    `geocode.js` (Google Geocoding + Open-Meteo fallback).
  - `app/` — Nuxt 3 SPA frontend (pages, components, composables, plugins).
  - `k8s/travelmanager/` — Helm chart. `terraform_gke/` — GKE IaC. `terraform/` +
    `terraform_iaas/` — Cloud Run / GCE baselines (perf comparison).
  - `tests/load/` — Locust harness. `docs/` — this + companion docs + LikeC4.
  - `Dockerfile.service` (build-arg `SERVICE=<name>`, all 7 services) + root `Dockerfile`
    (frontend).
- **Languages / frameworks / libraries:**
  - **JavaScript / Node.js** throughout. **Nitro** (server engine) per service;
    **Nuxt 3 + Vue 3** frontend.
  - Libraries: `pg` (Postgres), `firebase-admin` + `firebase` (auth/Firestore),
    `@google-cloud/pubsub`, `@sendgrid/mail`, Google Maps JS SDK.
  - IaC/ops: **Terraform**, **Helm**, **kubectl**, **External Secrets Operator**.
  - Tests: **Locust** (Python) for load.

## 3.2 Pipelines

**CI/CD — `.github/workflows/deploy.yml`** (push to `main`):
1. **Test** — compile-check all services.
2. **Build & push** — 8 images (7 services + frontend) → Artifact Registry, tagged
   `$GITHUB_SHA` + `latest`.
3. **Deploy** — `helm upgrade --install travelmanager k8s/travelmanager` to GKE.

Authentication uses **Workload Identity Federation** (OIDC from
`token.actions.githubusercontent.com`) — **no JSON service-account keys** in GitHub.
This realizes 12-Factor build/release/run end-to-end (`MILESTONE2_SUBMISSION.md` §6).

A second workflow `.github/workflows/likec4.yml` publishes the C4 model to GitHub Pages.

---

# 4. Performance Tests

**Goal (assignment):** run the periodic load test for the Trip Management part against
the **Kubernetes (GKE)** deployment and compare it to the **Cloud Run** environment.

**Harness** — Locust, `tests/load/`. Two user classes: `BrowsingUser` (anonymous,
weight 3) + `AuthedUser` (real Firebase `signInWithPassword`, weight 1). Load shapes
(`tests/load/shapes/`): **periodic** (4 cycles × 240s, 20↔100 users — stresses
autoscaling cooldown) and **spike** (10→500 burst). Scalability datasets:
`seed_bulk_trips.py` (large trip volume), `async_flood.py` (floods `TripCreated` →
exercises feed build + warning diff), `fixtures/warnings.json` + `seed-warnings`
endpoint (deterministic diff input). Worker scale-out observed via `kubectl get hpa` +
per-worker `/api/control`.

**Baseline results so far** (`tests/load/reports/`):

| Scenario · target | Median | p95 | p99 | RPS | Fail % |
|---|---|---|---|---|---|
| Periodic · Cloud Run | 55 ms | 140 ms | 220 ms | 25.2 | 0.53% |
| Periodic · IaaS VM | 71 ms | 350 ms | 650 ms | 10.8 | 0.31% |
| Spike · IaaS VM | 140 ms | 1.7 s | 5.1 s | 84.2 | 0.09% |
| Spike · Cloud Run | 160 ms | 2.1 s | 5.6 s | 82.8 | 0.10% |
| 2000-user · IaaS | 530 ms | 58 s | 110 s | 35.6 | 0.08% |
| 2000-user · Cloud Run | 690 ms | 87 s | 146 s | 23.6 | 1.41% |
| **Periodic · GKE** | **⏳ PENDING** | | | | |

> **⚠️ Open item — GKE run not yet executed.** The required **periodic-test-on-GKE vs
> Cloud Run** comparison is not yet filled. The Cloud Run + IaaS columns are the
> submitted baseline; the GKE row and the full write-up in
> `tests/load/reports/REPORT.md` still carry `<TBD>` cells. **To close this:** point
> Locust at `https://onecloudaway.de`, run the `periodic` shape, capture HTML+CSV into
> `tests/load/reports/`, then fill the row above + `REPORT.md`.

**How to run the GKE periodic test**
```bash
cd tests/load
locust -f locustfile.py --host https://onecloudaway.de \
  --shape periodic --headless --html reports/periodic_gke.html --csv reports/periodic_gke
# observe autoscaling during the run:
kubectl get hpa -w
curl -s https://onecloudaway.de/api/control   # per-worker async stats
```

**Findings (current baseline).** Autoscaling (Cloud Run) keeps the periodic tail tight;
the single IaaS VM saturates at peak. Both survive the 500-user spike (<0.2% fail),
Cloud Run paying cold-start during ramp. At 2000 users both pass their practical
ceiling. GKE microservice autoscaling under `async_flood` is confirmed qualitatively
via HPA + `/api/control`; the quantitative GKE periodic row is the remaining gap.

---

## Appendix — Status against the rubric

| Rubric § | Status |
|---|---|
| 1.1 System Context | ✅ diagram + actors + external interfaces |
| 1.2 Feature Overview | ✅ |
| 1.3 Domain Model | ✅ entities + relationships + key attrs |
| 2.1 Runtime Overview | ✅ cloud diagram, configs, sync/async, live links |
| 2.2 Microservices | ✅ per-service config/scaling/security/conns/isolation |
| 2.3 Datastores | ✅ stores + DDL data model + isolation |
| 2.4 Security: Roles | ✅ SAs + app roles + isolation |
| 2.5 IaC | ✅ |
| 3.1 Software Components | ✅ repo/org/langs/frameworks/libs |
| 3.2 Pipelines | ✅ |
| 4 Performance Tests | 🟡 baseline done; **GKE periodic vs Cloud Run row pending** |
```
