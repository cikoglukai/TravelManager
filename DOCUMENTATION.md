# TravelManager – Cloud Native Application Documentation

**Project:** One Cloud Away  
**Course:** Cloud Application Development – Summer Term 2026  
**Stack:** Nuxt 3 · Vue 3 · PostgreSQL 16 · Firebase · GKE Autopilot · Terraform

---

## 1 Requirements

### 1.1 System Context

TravelManager is a SaaS platform for planning and sharing leisure trips. Users manage personal itineraries, discover public trips from the community, and receive live travel information. A B2B interface gives destination partners access to aggregated traveler data.

**System Context Diagram** → [LikeC4 – Level 1](https://[your-org].github.io/[repo]/index.html)

| Actor / System | Description |
|---|---|
| **Traveler** | Authenticated end user. Creates, manages and shares trips. Receives alerts and feed. |
| **Destination Manager** | B2B partner. Accesses aggregated destination analytics via `/b2b/*` API. |
| **Firebase Auth** | Google identity platform. Issues signed JWTs (email/password + Google OAuth). |
| **RapidAPI (Skyscanner / Booking.com)** | Live flight and hotel search. Called on-demand from the backend. |
| **Travel Warnings API** | Official government warning feeds (e.g. Auswärtiges Amt). Polled by async worker. |
| **Weather API** | Third-party weather data for destination cities. Polled by async worker. |
| **SendGrid** | Transactional email delivery for alerts and newsletters. |

---

### 1.2 Feature Overview

| Feature | Description |
|---|---|
| **Authentication** | Email/password and Google OAuth via Firebase. Global auth guard; anonymous users cannot access protected pages. |
| **Trip Management** | Full CRUD for trips. Each trip has title, destination, origin, dates, short and detailed description. |
| **Travel Planning** | Itinerary builder: template mode (curated destinations, routes, transport, accommodation) or custom free-form mode. |
| **Waypoint Management** | Add, order and delete locations within a trip (name, description, image, date range). |
| **Live Offers** | On-demand search for flights (Skyscanner) and hotels (Booking.com) via RapidAPI. |
| **3D Globe Explore** | Interactive WebGL globe (globe.gl / Three.js) showing 15 European destination countries. |
| **Community Feed** | Public trip board. All authenticated users can browse trips from other travelers. |
| **Social Interactions** | Like and review trips. Star ratings (1–5) + comments stored in Firestore. |
| **Travel Alerts** | Async worker polls warnings and weather, diffs against active plans, notifies affected users. |
| **User Profile** | Name, bio, home city, avatar (Firebase Storage upload). |
| **B2B Data API** | Aggregated destination analytics for partner access. |

---

### 1.3 Domain Model

```
┌──────────┐        ┌────────┐ 1   * ┌──────────────┐
│  User    │──────<│  Trip  │───────│ PlanLocation │
│──────────│  owns  │────────│       │──────────────│
│ firebase_│        │ id     │       │ name         │
│ _uid (PK)│        │ user_uid│      │ date_from/to │
│ email    │        │ title  │       │ position     │
│ name     │        │ dest.  │       └──────────────┘
│ bio      │        │ origin │
│ home_city│        │ dates  │ 1   1 ┌──────────────┐
└──────────┘        └────────│───────│ TravelPlan   │
                             │       │──────────────│
                             │       │ mode         │
                             │       │ destination_id│
                             │       │ route_id     │
                             │       │ transport_id │
                             │       │ accom_id     │
                             │       └──────────────┘
                             │
                             │ 1   * ┌────────┐
                             └───────│ Review │  (Firestore)
                                     │ stars  │
                                     │ comment│
                                     └────────┘
                                        +
                                     ┌────────┐
                                     │  Like  │  (Firestore)
                                     │comment │
                                     └────────┘

┌─────────────┐ 1   * ┌───────┐ 1   * ┌──────────────────┐
│ Destination │───────│ Route │───────│ TransportOption  │
│─────────────│       │───────│       │ AccommodationOpt.│
│ country     │       │ name  │       └──────────────────┘
│ city, emoji │       │ days  │
└─────────────┘       │ highl.│
                      └───────┘
```

**Key attributes:**
- `Trip.short_description` max 80 chars; `detail_description` free text.
- `Review` is unique per (trip, user); stored in Firestore at `/reviews/{tripId}/users/{userId}`.
- `TravelPlan` is 1:1 with Trip; stores either a reference to template data (destination/route IDs) or free-form `custom_*` fields.
- `Destination` seeded: 15 European countries, each with 1–2 curated routes.

---

## 2 Runtime View

### 2.1 Runtime Overview

**Deployed environment:**

| Environment | URL | Technology |
|---|---|---|
| Production (PaaS) | `https://travelmanager.app` | GKE Autopilot, `europe-west1` |
| Tenant subdomains | `https://<tenant>.travelmanager.app` | gleicher Cluster, Routing per Host-Header |
| Local Dev | `http://localhost:3000` | Docker Compose |

**Cloud Resource Diagram** → [LikeC4 – Level 2 Containers](https://[your-org].github.io/[repo]/containers.html)

```
Browser / API Client
  │  HTTPS
  ▼
GKE Ingress (L7 Load Balancer)
  │  routes *.travelmanager.app
  ▼
BFF-Gateway (Nuxt 3 SSR, port 8080)
  ├── shared-auth Middleware
  │     ├── Firebase JWT Verification
  │     ├── Tenant-Auflösung per Host-Header (subdomain → tenantId/plan)
  │     └── Plan-Gate (free / standard / enterprise)
  ├── Synchrone Proxies → interne Services (HTTP, Kubernetes ClusterIP)
  │     ├── Trip Service          http://trip.shared-services.svc.cluster.local
  │     ├── Destination Service   http://destination.shared-services.svc.cluster.local
  │     ├── Booking-Integrations  http://booking-integrations.shared-services.svc.cluster.local
  │     ├── Social Service        http://social.shared-services.svc.cluster.local
  │     ├── Travel-Info Service   http://travel-info.shared-services.svc.cluster.local
  │     ├── Identity-Tenant       http://identity-tenant.shared-services.svc.cluster.local
  │     └── Notification Service  http://notification.shared-services.svc.cluster.local
  └── SSR-gerenderte Vue 3 Pages (SPA-Assets)

Asynchrone Kommunikation:
  Trip Service ──publish──► GCP Pub/Sub ──push (OIDC)──► Social Service
                                        ──push (OIDC)──► Notification Service
  Travel-Info  ──publish──► GCP Pub/Sub ──push (OIDC)──► Notification Service
  Social       ──publish──► GCP Pub/Sub (newsletter.scheduled)
```

**Externe Interfaces:**

| Interface | Richtung | Beschreibung |
|---|---|---|
| Firebase Auth | eingehend | JWT-Ausstellung (Browser → Firebase, Token dann → BFF-Gateway) |
| RapidAPI (Skyscanner / Booking.com) | ausgehend | Live-Flug- und Hotelsuche, aufgerufen von Booking-Integrations |
| Travel Warnings API | ausgehend | Regierungs-Reisewarnungen, gepollt von Travel-Info |
| Weather API (OpenWeatherMap) | ausgehend | Wetterdaten für Reiseziele, gepollt von Travel-Info |
| SendGrid | ausgehend | Transaktionale E-Mails (Reisewarnungen, Newsletter) |
| Firebase Firestore | bidirektional | Likes, Review-Kommentare (BFF-Gateway / Social Service) |
| Firebase Storage | ausgehend | Avatar-Upload (`gs://<bucket>/avatars/{userId}`) |

**Synchrone Services:** Das BFF-Gateway nimmt HTTP-Anfragen entgegen, validiert den JWT und leitet die Anfrage per internem HTTP-Proxy (`server/utils/proxy.js`) über Kubernetes ClusterIP an den zuständigen Downstream-Service weiter. Jeder Service antwortet synchron; das BFF-Gateway gibt die Antwort direkt an den Client zurück. Der Proxy forwarded dabei `Authorization`, `x-tenant-id`, `x-tenant-plan` und `x-user-uid` als Header.

**Asynchrone Services:** Nach schreibenden Operationen publiziert der Trip Service Ereignisse auf GCP Pub/Sub Topics (`trip.created`, `trip.updated`, `trip.deleted`). Travel-Info publiziert `travel.warning.published` und `travel.weather.snapshot`. Pub/Sub liefert die Nachrichten per HTTPS-Push mit einem Google-signierten OIDC-Token an die Endpunkte `/api/internal/pubsub/*` der jeweiligen Consumer-Services. Dead-Letter-Topics (7 Tage Retention) fangen fehlgeschlagene Zustellungen ab (max. 5 Versuche, Backoff 10 s – 600 s).

**API-Gateway (BFF-Gateway):** Das BFF-Gateway übernimmt die Rolle des API-Gateways. Es validiert Firebase JWTs via Firebase Admin SDK, löst aus dem Host-Header den `tenantId` und SaaS-Plan auf (`free` / `standard` / `enterprise`) und setzt Plan-Gates per `requirePlan()`-Middleware (`packages/shared-auth`). Weiterleitung an Downstream-Services erfolgt mit den o.g. Forwarding-Headers.

---

### 2.2 Microservices

Alle Services laufen als eigenständige Nitro/Node.js 22-Prozesse in separaten Kubernetes-Deployments im Namespace `shared-services`. Jeder Service hat ein eigenes Helm Chart (`/deploy/helm/<service>/`), ein eigenes Docker-Image in Artifact Registry und eine eigene Cloud SQL Datenbank.

#### BFF-Gateway – `travelmanager.app`, `*.travelmanager.app`

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nuxt 3 / Nitro, Node.js 22 Alpine, port 8080 |
| **Scaling** | Automatisch: HPA min 2 / max 10, Ziel CPU 70 %; PDB minAvailable 1 |
| **Security** | `shared-auth` Middleware: Firebase JWT-Validierung + Tenant-Auflösung + Plan-Gate; Secrets via ExternalSecrets (`FIREBASE_SERVICE_ACCOUNT`, `REDIS_URL`) |
| **Externe Services** | Redis/Memorystore (Tenant-Plan-Cache); alle Downstream-Services per HTTP ClusterIP |
| **Multi-tenancy** | Tenant wird per Host-Header aufgelöst; `x-tenant-id` und `x-tenant-plan` werden an alle Downstream-Anfragen weitergeleitet |
| **Ressourcen** | requests: 300 m CPU / 512 Mi RAM; limits: 2 CPU / 1 Gi |

#### Trip Service – `/api/trips/*`, `/api/locations/*`

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22, port 8080 |
| **Scaling** | Automatisch: HPA min 2 / max 12, Ziel CPU 70 %; PDB minAvailable 1 |
| **Security** | `shared-auth` Middleware; `PUT`/`DELETE` prüfen `trip.user_uid == auth.uid` (403 sonst); Secrets: `DATABASE_URL_TRIP` |
| **Datastores** | Cloud SQL DB `trip` (Tabellen: `users`, `trips`, `plan_locations`); publiziert auf Pub/Sub (`trip.created`, `trip.updated`, `trip.deleted`) |
| **Multi-tenancy** | Alle Schreibvorgänge sind an `firebase_uid` gebunden; kaskadierende Löschung bei User-Removal; Pub/Sub-Nachrichten enthalten `tenantId` |
| **Ressourcen** | requests: 200 m CPU / 384 Mi; limits: 1 CPU / 768 Mi |

#### Destination Service – `/api/destinations/*`, `/api/b2b/*`

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22, port 8080 |
| **Scaling** | Automatisch: HPA min 2 / max 10, Ziel CPU 70 % |
| **Security** | `GET /api/destinations/*` öffentlich (kein JWT); B2B-Endpunkt erfordert `enterprise`-Plan via `requirePlan()` |
| **Datastores** | Cloud SQL DB `destination` (Tabellen: `destinations`, `routes`, `transport_options`, `accommodation_options`) – zur Laufzeit read-only, 15 europäische Länder einmalig geseeded |
| **Multi-tenancy** | Referenzdaten tenant-unabhängig; B2B-Abfragen gefiltert per `tenantId` aus Header |
| **Ressourcen** | requests: 100 m CPU / 256 Mi; limits: 500 m / 512 Mi |

#### Booking-Integrations – `/api/flights`, `/api/hotels`, `/api/buses`

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22, port 8080 |
| **Scaling** | Automatisch: HPA min 2 / max 8, Ziel CPU 70 % |
| **Security** | JWT erforderlich; `RAPIDAPI_KEY` ausschließlich serverseitig (nie an Client); Secrets: `RAPIDAPI_KEY`, `REDIS_URL` |
| **Datastores** | Redis/Memorystore (Angebots-Cache, vermeidet Doppel-Calls an RapidAPI) |
| **Multi-tenancy** | Keine persistente Datenhaltung; Cache-Keys sind anfragespezifisch |
| **Ressourcen** | requests: 100 m CPU / 256 Mi; limits: 500 m / 512 Mi |

#### Identity-Tenant Service – `/api/tenants/*`, `/api/users/me`

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22, port 8080 |
| **Scaling** | Automatisch: HPA min 2 / max 6, Ziel CPU 70 % |
| **Security** | Admin-Endpunkte (`PUT /tenants/:id/plan`) erfordern `superadmin`-UID; Secrets: `DATABASE_URL_IDENTITY`, `SUPERADMIN_UID` |
| **Datastores** | Cloud SQL DB `identity` (Tabellen: `tenants`, `white_label`, `sso_config`, `users`); Tenant-Plan-Cache wird vom BFF-Gateway via interner API abgefragt |
| **Multi-tenancy** | Kern-Tenant-Registry; `tenants.plan` bestimmt Feature-Zugang plattformweit; `users`-Tabelle hat PK `(firebase_uid, tenant_id)` |
| **Ressourcen** | requests: 100 m CPU / 256 Mi; limits: 500 m / 512 Mi |

#### Social Service – Feed, Follows, Newsletter

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22, port 8080; Pub/Sub Push-Consumer auf `/api/internal/pubsub/trip-created` |
| **Scaling** | Automatisch: HPA min 2 / max 20; skaliert auch auf Pub/Sub-Backlog (Subscription `trip.created.social-feed-fanout`, Ziel 100 Nachrichten/Pod) |
| **Security** | Pub/Sub-Push-Endpunkt verifiziert Google-OIDC-Token (`verifyPubsubPushToken` aus `shared-auth`); Secrets: `DATABASE_URL_SOCIAL` |
| **Datastores** | Cloud SQL DB `social` (Tabellen: `follows`, `social_activities`, `newsletter_runs`); Firestore für Activity-Feed-Einträge |
| **Multi-tenancy** | Alle Tabellen enthalten `tenant_id`; Abfragen sind immer tenant-gefiltert |
| **Ressourcen** | requests: 200 m CPU / 384 Mi; limits: 1 CPU / 768 Mi |

#### Travel-Info Service – Warnungen & Wetter

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22; getriggert durch GCP Cloud Scheduler |
| **Scaling** | Automatisch: HPA min 2 / max 15; skaliert auf Pub/Sub-Backlog (Subscription `travel.warning.match`, Ziel 100/Pod) |
| **Security** | Pub/Sub-Push verifiziert per OIDC; Secrets: `DATABASE_URL_TRAVEL_INFO`, `OPENWEATHER_API_KEY` |
| **Datastores** | Cloud SQL DB `travel_info`; publiziert auf Topics `travel.warning.published`, `travel.weather.snapshot` |
| **Multi-tenancy** | Warnungen werden mit `tenantId` aus den Trip-Daten angereichert vor der Publikation |
| **Ressourcen** | requests: 200 m CPU / 384 Mi; limits: 1 CPU / 768 Mi |

#### Notification Service – E-Mail, Push, In-App

| Eigenschaft | Detail |
|---|---|
| **Runtime** | Nitro, Node.js 22; Pub/Sub Push-Consumer auf `/api/internal/pubsub/notification-dispatch` |
| **Scaling** | Automatisch: HPA min 2 / max 15; skaliert auf Pub/Sub-Backlog (Subscription `notification.dispatch`, Ziel 100/Pod) |
| **Security** | Push-Endpunkt verifiziert per OIDC; Secrets: `DATABASE_URL_NOTIFICATION`, `SENDGRID_API_KEY` |
| **Datastores** | Cloud SQL DB `notification` (Tabellen: `preferences`, `delivery_log`, `in_app_notifications`, `suppressions`, `push_subscriptions`, `users_cache`) |
| **Externe Services** | SendGrid (E-Mail), Web Push API via VAPID (Browser-Push) |
| **Multi-tenancy** | Alle Tabellen enthalten `(user_uid, tenant_id)` als zusammengesetzten Schlüssel; White-Label-Branding des Tenants wird in E-Mail-Templates eingebettet |
| **Ressourcen** | requests: 100 m CPU / 256 Mi; limits: 500 m / 512 Mi |

---

### 2.3 Datastores

#### Cloud SQL PostgreSQL 16

**Eine Instanz, eine Datenbank pro Service** (Private Service Access, kein öffentliches IP). IAM-Datenbankauthentifizierung aktiviert — Services verbinden sich per Workload Identity (kein Passwort in Secret Manager für Service-User).

| Datenbank | Service | Wichtige Tabellen & Datenmodell |
|---|---|---|
| `trip` | Trip Service | `users` (firebase_uid PK, email, name, bio, avatar_url); `trips` (id PK, user_uid FK→users CASCADE, title, destination, origin, start_date, end_date, short_description); `plan_locations` (id PK, trip_id FK CASCADE, name, date_from, date_to, position) |
| `destination` | Destination Service | `destinations` (id PK, country, city, emoji); `routes` (id PK, destination_id FK, name, duration_days, highlights); `transport_options` (route_id FK, type, price_from); `accommodation_options` (route_id FK, type, price_per_night, rating) |
| `identity` | Identity-Tenant | `tenants` (id PK, name, plan: free/standard/enterprise); `white_label` (tenant_id FK, logo_url, primary_color, custom_domain); `sso_config` (tenant_id FK, provider, config_json JSONB); `users` (firebase_uid+tenant_id PK, email, role) |
| `social` | Social Service | `follows` (follower_uid+followee_uid PK, tenant_id); `social_activities` (id PK, event_id UNIQUE, actor_uid, tenant_id, verb, object_id); `newsletter_runs` (tenant_id+week_of UNIQUE) |
| `notification` | Notification Service | `preferences` (user_uid+tenant_id PK, email/push/in_app_enabled); `delivery_log` (event_id PK, channels_json, results_json JSONB); `in_app_notifications` (id, user_uid, tenant_id, subject, data JSONB, read_at); `push_subscriptions` (user_uid+tenant_id+endpoint UNIQUE, subscription_json JSONB); `suppressions` (user_uid+tenant_id+channel PK) |
| `travel_info` | Travel-Info Service | Eigene DB; gecachte Warning- und Wetterdaten |

**Enterprise-Tenants** erhalten auf Wunsch eine dedizierte Cloud SQL Instanz (`<name>-ent-<tenantId>`, REGIONAL Availability, PITR aktiviert) — provisioniert durch das `cloudsql-multi` Terraform-Modul.

**Multi-tenancy-Isolation:** Alle service-eigenen Tabellen enthalten `tenant_id`; Queries filtern immer auf `tenant_id`. Enterprise-Tenants erhalten eine vollständig getrennte Datenbankinstanz.

**Schema-Init:** Idempotent (`CREATE TABLE IF NOT EXISTS`) im Nitro-Startup-Plugin `server/plugins/0.init-db.js`. Produktiv läuft die Migration als Kubernetes Job vor dem Rollout (`SKIP_DB_INIT=1` im Container gesetzt).

---

#### GCP Pub/Sub

| Topic | Publisher | Subscriber(s) | Zweck |
|---|---|---|---|
| `trip.created` | Trip Service | Social, Notification | Feed-Fanout, Willkommens-Benachrichtigung |
| `trip.updated` | Trip Service | Social, Notification | Feed-Update |
| `trip.deleted` | Trip Service | Social | Feed-Einträge entfernen |
| `travel.warning.published` | Travel-Info | Notification | Reisewarnung an betroffene Nutzer |
| `travel.weather.snapshot` | Travel-Info | Notification | Wetterupdate für aktive Trips |
| `notification.requested` | mehrere Services | Notification | Zentraler Dispatch-Eingang |
| `newsletter.scheduled` | Social | Notification | Wöchentlicher Newsletter-Trigger |

Jedes Topic hat ein Dead-Letter-Topic (`<topic>.dlq`, 7 Tage Retention) und eine DLQ-Drain-Subscription für manuelle Wiederholung. Retry-Policy: min 10 s / max 600 s Backoff, max. 5 Zustellversuche.

**Multi-tenancy:** Jede Pub/Sub-Nachricht enthält `tenantId` im Envelope-Schema (`packages/shared-events`); Consumer verarbeiten Nachrichten immer tenant-isoliert.

---

#### Firebase Firestore

Datenbank: `onecloudaway-db` (nam5 multi-region)

```
/likes/{tripId}/users/{userId}
  { comment: string, userName: string, createdAt: timestamp }

/reviews/{tripId}/users/{userId}
  { comment: string, createdAt: timestamp }
```

**Multi-tenancy:** Dokumentpfad enthält `userId`; server-seitige Prüfung stellt sicher, dass nur der Eigentümer schreiben kann.

---

#### Redis / Cloud Memorystore (Redis 7.2)

Zwei Verwendungszwecke:
- **BFF-Gateway:** Tenant-Plan-Cache (TTL-basierte Lookups vom Identity-Tenant Service)
- **Booking-Integrations:** Angebots-Cache für RapidAPI-Responses

Private IP im VPC (authorized network); kein öffentlicher Zugriff.

---

#### Firebase Storage

Avatar-Bilder: `gs://<bucket>/avatars/{userId}`. Upload nur nach Authentifizierung (`useImageUpload.js`).

---

### 2.4 Security: Roles and Role Mapping

#### Firebase Authentication
- Alle Nutzer authentifizieren sich via Firebase (Email/Passwort oder Google OAuth).
- ID-Tokens (1 h TTL) werden im BFF-Gateway durch `packages/shared-auth` (`initFirebaseAdmin` + `verifyIdToken`) validiert.
- Öffentliche Endpunkte (kein JWT): `GET /api/trips/all`, `GET /api/destinations/*`, `GET /api/likes/trip/*`, `GET /api/health`.
- Pub/Sub-Push-Endpunkte (`/api/internal/pubsub/*`) werden per Google-OIDC-Token gesichert (`verifyPubsubPushToken`), nicht per Firebase JWT.

#### Plan-Gating (SaaS Multi-Tenancy)
Drei Pläne: `free` → `standard` → `enterprise`. Der Plan wird im BFF-Gateway per Host-Header ermittelt (Subdomain → Identity-Tenant-Lookup → Redis-Cache) und als `x-tenant-plan`-Header an alle Downstream-Services weitergeleitet. Endpunkte können per `requirePlan('standard', handler)` abgesichert werden.

#### GCP Service Accounts (Workload Identity)

Kein Service besitzt einen GSA-Schlüssel — Authentifizierung ausschließlich per **Workload Identity** (KSA ↔ GSA Binding via Terraform `iam`-Modul).

| Service Account | Kubernetes Service | GCP-Rollen |
|---|---|---|
| `bff-gateway-svc@` | bff-gateway | `roles/datastore.user`, `roles/secretmanager.secretAccessor` |
| `trip-svc@` | trip | `roles/cloudsql.client`, `roles/pubsub.publisher`, `roles/secretmanager.secretAccessor` |
| `destination-svc@` | destination | `roles/cloudsql.client`, `roles/secretmanager.secretAccessor` |
| `booking-integrations-svc@` | booking-integrations | `roles/secretmanager.secretAccessor` |
| `identity-tenant-svc@` | identity-tenant | `roles/cloudsql.client`, `roles/secretmanager.secretAccessor` |
| `social-svc@` | social | `roles/cloudsql.client`, `roles/pubsub.subscriber`, `roles/datastore.user`, `roles/secretmanager.secretAccessor` |
| `travel-info-svc@` | travel-info | `roles/cloudsql.client`, `roles/pubsub.publisher`, `roles/secretmanager.secretAccessor` |
| `notification-svc@` | notification | `roles/cloudsql.client`, `roles/pubsub.subscriber`, `roles/secretmanager.secretAccessor` |

#### Secret Manager
Secrets werden per **ExternalSecrets Operator** aus GCP Secret Manager in Kubernetes Secrets synchronisiert. Jeder Service hat ein eigenes Secret-Objekt (z. B. `trip-secrets`) mit nur den für ihn notwendigen Keys. Kein Service kann auf Secrets anderer Services zugreifen.

#### Netzwerk-Isolation
- **NetworkPolicy** per Helm Chart: Jeder Service akzeptiert eingehenden Traffic ausschließlich aus dem Namespace `shared-services` (BFF-Gateway zusätzlich aus `infra` für den Ingress).
- Alle Services sind **nicht** direkt vom Internet erreichbar — nur der GKE Ingress ist öffentlich.
- Cloud SQL und Redis sind per Private Service Access ans VPC gebunden (kein öffentliches IP).

**Multi-tenancy:** Alle Datenbankschreibvorgänge sind an `(firebase_uid, tenant_id)` gebunden. Cross-Tenant-Zugriff ist auf API-Ebene durch Tenant-Filter in jedem Query ausgeschlossen. Enterprise-Tenants erhalten optional eine dedizierte Datenbankinstanz.

---

### 2.5 Infrastructure as Code

Alle Cloud-Ressourcen werden mit **Terraform** (`/terraform/`) und **Helm** (`/deploy/helm/`) verwaltet. Remote State liegt in GCS (`gs://travelmanager-tfstate`, Prefix `cloud-native`); Workspaces: `staging` und `prod`.

#### Terraform-Module (`/terraform/modules/`)

| Modul | Provisioniert |
|---|---|
| `gke` | GKE Autopilot-Cluster (`travelmanager-prod`, `europe-west1`), VPC-native Networking (Subnetz 10.10.0.0/20, Pods 10.20.0.0/14, Services 10.24.0.0/20), Cloud NAT, Cloud Router |
| `cloudsql-multi` | Cloud SQL PostgreSQL 16 (Shared Instance + dedizierte Enterprise-Instanzen), Private Service Access, IAM-DB-Auth, eine Datenbank und ein IAM-DB-User pro Service |
| `memorystore` | Redis 7.2 im VPC (Booking-Cache + Tenant-Plan-Cache) |
| `pubsub` | Alle Topics + DLQ-Topics + Subscriptions mit Retry-Policy und Dead-Letter-Config; DLQ-Drain-Subscriptions |
| `iam` | Workload Identity Bindings (KSA ↔ GSA), Secret Manager Accessor-Rollen, Pub/Sub Publisher/Subscriber-Rollen pro Service |
| `artifact-registry` | Docker-Repository pro Service in `europe-west1` |
| `scheduler` | Cloud Scheduler Jobs für Travel-Info (Polling-Trigger) und Newsletter-CronJob |

```bash
# Einmalig:
gsutil mb -l europe-west1 gs://travelmanager-tfstate
terraform init -backend-config="bucket=travelmanager-tfstate"
terraform workspace new prod

# Deployment:
cd terraform/envs/prod
terraform apply -var="project_id=<project>" -var="region=europe-west1"
```

#### Helm Charts (`/deploy/helm/`)

Pro Service ein Chart mit einheitlicher Struktur: Deployment, Service, HPA, PDB, NetworkPolicy, ServiceMonitor (Prometheus), ExternalSecrets. Gemeinsame Prod-Werte in `/deploy/helm/values/prod.yaml` (`project: travelmanager-prod`, `region: europe-west1`, `domain: travelmanager.app`, `namespace: shared-services`).

```bash
# Einzelner Service deployen:
helm upgrade --install trip ./deploy/helm/trip \
  -f ./deploy/helm/values/prod.yaml \
  --set image.tag=<git-sha> \
  --namespace shared-services

# Alle Services via Umbrella-Chart:
helm upgrade --install travelmanager ./deploy/helm/tenant-bundle \
  -f ./deploy/helm/values/prod.yaml \
  --namespace shared-services
```

#### Build-Artefakte
Jeder Service hat ein eigenes Dockerfile (Node 22 Alpine). Images werden in Artifact Registry gespeichert:
`europe-west1-docker.pkg.dev/<project>/travelmanager-<service>/app:<git-sha>`

---

## 3 Development View

### 3.1 Software Components

**Repository:** Single Monorepo auf GitHub — `johannaprinz/CloudApplicationDevelopment`

Das Repository ist als **npm workspace Monorepo** organisiert: alle Services und Shared Packages teilen sich eine `package-lock.json` und werden gemeinsam installiert (`npm ci`). Dadurch können Services lokale Pakete (`@travelmanager/shared-auth` etc.) ohne Publish-Schritt referenzieren.

```
/
├── services/                        # 8 eigenständige Microservices (je Dockerfile + Helm Chart)
│   ├── bff-gateway/                 # Nuxt 3 SSR — Ingress, Auth-Middleware, Reverse-Proxy
│   │   ├── app/                     # Vue 3 SPA (pages, components, composables, plugins)
│   │   └── server/                  # Nitro API-Routen + Proxy-Logik
│   ├── trip/                        # Nitro — Trip/Location CRUD, Pub/Sub Publisher
│   ├── destination/                 # Nitro — Reiseziel-Referenzdaten (read-only, geseeded)
│   ├── booking-integrations/        # Nitro — RapidAPI-Proxy (Flüge, Hotels, Busse) + Redis-Cache
│   ├── identity-tenant/             # Nitro — Tenant-Verwaltung, Plan-Updates, User-Profil
│   ├── social/                      # Nitro — Feed, Follows, Newsletter, Pub/Sub Consumer
│   ├── travel-info/                 # Nitro — Warnungen/Wetter-Polling, Pub/Sub Publisher
│   └── notification/                # Nitro — E-Mail/Push/In-App-Dispatch, Pub/Sub Consumer
├── packages/                        # Shared Libraries (npm workspaces, kein eigenes Publish)
│   ├── shared-auth/                 # Firebase JWT-Validierung, Tenant-Auflösung, Plan-Gate, Pub/Sub-OIDC
│   ├── shared-db/                   # pg-Pool-Factory, Schema-Resolver (free/standard/enterprise), withTenant()
│   ├── shared-events/               # Pub/Sub publish/subscribe, JSON-Schema-Validierung (Ajv), Envelope-Format
│   └── shared-config/               # 12-Factor-Config-Loader mit Schema-Validierung und Fail-Fast
├── deploy/
│   └── helm/                        # Helm Charts pro Service
│       ├── <service>/values.yaml    # Service-spezifische HPA/PDB/NetworkPolicy/ExternalSecrets-Konfiguration
│       ├── values/prod.yaml         # Gemeinsame Prod-Werte (project, region, domain, namespace)
│       ├── values/staging.yaml      # Staging-Overrides
│       ├── tenant-bundle/           # Umbrella-Chart für alle Services
│       └── tenants/                 # Tenant-spezifische Overrides (acme.yaml, globex.yaml)
├── terraform/
│   ├── modules/                     # Wiederverwendbare Terraform-Module (gke, cloudsql-multi, pubsub, iam, …)
│   ├── envs/prod/                   # Prod-Environment-Komposition
│   └── envs/staging/                # Staging-Environment-Komposition
├── docs/architecture/               # LikeC4 C4-Modell (workspace.c4) → GitHub Pages
├── tests/load/                      # Locust-Lasttests (locustfile.py, seed_users.py, seed_trips.py)
├── docker-compose.yml               # Lokale Entwicklungsumgebung (alle Services + PostgreSQL)
└── package.json                     # Workspace-Root (scripts: dev, build, compose)
```

**Softwarekomponenten:**

| Komponente | Typ | Beschreibung |
|---|---|---|
| **BFF-Gateway** | Nuxt 3 Service | Einziger öffentlicher Endpunkt. Rendert Vue 3 SPA (SSR) und proxied `/api/*` an Downstream-Services. Enthält Auth-Middleware und Tenant-Auflösung. |
| **Trip Service** | Nitro Service | CRUD für Trips, Locations und Travel Plans. Publiziert `trip.*`-Events auf Pub/Sub. |
| **Destination Service** | Nitro Service | Read-only Referenzdaten für 15 europäische Reiseziele inkl. Routen, Transport- und Unterkunftsoptionen. |
| **Booking-Integrations** | Nitro Service | Proxy zu RapidAPI (Skyscanner, Booking.com). Cacht Ergebnisse in Redis. |
| **Identity-Tenant** | Nitro Service | Verwaltet Tenants, SaaS-Pläne, White-Label-Branding und User-Profile. |
| **Social Service** | Nitro Service | Community-Feed, Follow-Graph, Newsletter-Runs. Pub/Sub Consumer für Trip-Events. |
| **Travel-Info Service** | Nitro Service | Pollt Travel Warnings API und OpenWeatherMap. Publiziert Warn- und Wetter-Events auf Pub/Sub. |
| **Notification Service** | Nitro Service | Versendet E-Mails (SendGrid), Browser-Push (VAPID) und In-App-Notifications. Pub/Sub Consumer. |
| **shared-auth** | npm Package | Firebase JWT-Verifikation, Tenant-Auflösung per Host-Header, Plan-Gate-Middleware, Pub/Sub-OIDC-Verifikation. Wird von allen Services verwendet. |
| **shared-db** | npm Package | `pg`-Pool-Factory mit Multi-Tenancy-Schema-Resolver: `free` → shared Schema, `standard` → eigenes Schema, `enterprise` → eigene Datenbankinstanz. |
| **shared-events** | npm Package | Pub/Sub-Publisher mit JSON-Schema-Validierung (Ajv) und standardisiertem Envelope (`eventId`, `tenantId`, `occurredAt`, `version`). |
| **shared-config** | npm Package | 12-Factor-Config-Loader: validiert Env-Variablen gegen ein Schema, wirft bei fehlenden Pflichtfeldern einen Fehler beim Start. |

**Programmiersprachen & Frameworks:**

| Layer | Sprache | Framework / Laufzeit |
|---|---|---|
| Frontend (SPA) | JavaScript, ES Modules | Nuxt 3, Vue 3, Composition API, globe.gl (Three.js) |
| Backend (Services) | JavaScript, TypeScript (Middleware) | Nitro (Nuxt Server Engine), Node.js 22 |
| Shared Packages | JavaScript, ES Modules | — |
| IaC | HCL | Terraform ≥ 1.9, Helm 3 |
| Lasttests | Python 3.12 | Locust ≥ 2.31, firebase-admin |
| Architektur-Dokumentation | LikeC4 DSL | LikeC4 1.56 |

**Wichtige Libraries:**

| Package | Zweck |
|---|---|
| `nuxt` ^3.13 | Full-Stack Vue-Framework (SSR + Nitro) |
| `firebase` ^12.12 | Client-seitige Auth + Firestore |
| `firebase-admin` ^11.11 | Server-seitige JWT-Verifikation + Firestore Admin |
| `@google-cloud/pubsub` | Pub/Sub Publisher und Subscriber |
| `google-auth-library` | OIDC-Token-Verifikation für Pub/Sub Push-Endpunkte |
| `pg` ^8.20 | PostgreSQL-Client (node-postgres) |
| `ajv` | JSON-Schema-Validierung für Pub/Sub-Event-Envelopes |
| `@sendgrid/mail` | E-Mail-Versand (Notification Service) |
| `web-push` | Browser-Push-Notifications via VAPID (Notification Service) |
| `globe.gl` ^2.45 | 3D-WebGL-Globus (Three.js-Wrapper, BFF-Gateway) |

---

### 3.2 Pipelines

Das Projekt verwendet **GitHub Actions** mit 5 Workflows für CI, CD-Staging, CD-Prod, Terraform und Lasttests. Die Authentifizierung gegenüber GCP erfolgt ausschließlich über **Workload Identity Federation** — kein GSA-Key wird in GitHub Secrets gespeichert.

#### CI – `ci.yml`

**Trigger:** Pull Requests auf `main` und direkte Pushes auf `main`.

```
PR / Push → main
  ├── lint-typecheck    ESLint + vue-tsc (non-blocking bis Ruleset steht)
  ├── unit              Vitest (falls *.test.* Dateien existieren)
  └── build-images      Docker build (kein Push) — Matrix über alle 8 Services
                        GHA Layer Cache (scope pro Service) für schnelle Builds
```

Ziel: Sicherstellen, dass jeder Commit baut und Tests bestehen, bevor er in `main` landet.

---

#### CD Staging – `cd-staging.yml`

**Trigger:** Push auf `main`, wenn `services/**`, `packages/**`, `deploy/helm/**` oder `terraform/**` geändert wurden.

```
Push → main  (Dateifilter greift)
  ├── build-and-push    Matrix über alle 8 Services (parallel)
  │     ├── GCP Workload Identity Federation Auth
  │     ├── docker build-push-action (Multi-Stage, Node 22 Alpine)
  │     ├── GHA Layer Cache pro Service
  │     └── Push → Artifact Registry
  │           europe-west1-docker.pkg.dev/<staging-project>/travelmanager-<svc>/app:sha-<sha>
  │           europe-west1-docker.pkg.dev/<staging-project>/travelmanager-<svc>/app:latest
  └── helm-deploy       (needs: build-and-push)
        ├── GKE Credentials für travelmanager-staging
        ├── helm upgrade --install für alle 8 Services
        │     --set image.tag=sha-<sha>  --wait --timeout 5m
        └── Smoke-Test: GET /api/health pro Service via Host-Header
```

---

#### CD Prod – `cd-prod.yml`

**Trigger:** Git-Tag `v*` (z. B. `v1.2.0`). Das GitHub Environment `production` erfordert **manuelle Freigabe** vor dem Rollout.

```
git tag v1.2.0 → push tag
  ├── promote           Matrix über alle 8 Services (parallel)
  │     ├── GCP Workload Identity Federation Auth (Prod SA)
  │     ├── docker build-push-action
  │     └── Push → Artifact Registry
  │           .../travelmanager-<svc>/app:v1.2.0
  │           .../travelmanager-<svc>/app:stable
  └── rollout           (needs: promote) — Manual Approval required
        ├── GKE Credentials für travelmanager-prod
        └── helm upgrade --install für alle 8 Services
              --set image.tag=v1.2.0  --wait --timeout 10m
```

---

#### Terraform – `terraform.yml`

**Trigger:** PR oder Push auf `main` wenn `terraform/**` geändert.

```
PR:
  └── plan-staging    terraform fmt -check → init → plan → Kommentar auf PR

Push → main:
  └── plan-staging    … + terraform apply -auto-approve (Staging)
```

Prod-Infrastruktur wird manuell deployed (`terraform apply` lokal mit Prod-Credentials).

---

#### Nightly Loadtest – `loadtest-nightly.yml`

**Trigger:** Täglich 02:00 UTC (Cron) oder manuell.

```
Cron 02:00 UTC
  └── locust -f tests/load/locustfile.py
        --host https://staging.travelmanager.app
        --headless -u 200 -r 20 -t 30m
        LOCUST_SHAPE=periodic
        → HTML-Report + CSV als GitHub Actions Artifact
```

---

#### LikeC4 Architektur-Doku – `likec4.yml`

**Trigger:** Push auf `main` wenn `docs/architecture/**` geändert.

```
Push → main (docs/architecture/**)
  └── npx likec4 build docs/architecture -o dist → GitHub Pages
```

---

#### Build-Artefakte (Dockerfile)

Jeder Service verwendet ein **3-Stage Multi-Stage Dockerfile** (Node 22 Alpine):

```
Stage deps   npm ci --workspace=@travelmanager/<svc> --include-workspace-root
             (installiert Service + alle shared-packages)

Stage build  nuxt build   (BFF-Gateway → .output/ mit SSR + Assets)
             nitro build  (alle anderen Services → .output/server/index.mjs)

Stage run    COPY --from=build .output/ → /app/
             ENV NODE_ENV=production NITRO_PORT=8080 NITRO_HOST=0.0.0.0
             USER node   (non-root)
             CMD ["node", "server/index.mjs"]
```

Image-Naming-Konvention:
```
europe-west1-docker.pkg.dev/<project>/travelmanager-<service>/app:<tag>
  Tags: sha-<git-sha>  (Staging), v<semver>  (Prod), latest / stable  (Alias)
```

---

## 4 Performance Tests

### Setup

Load tests run with **Locust** (`tests/load/locustfile.py`) against three environments:

| Target | URL |
|---|---|
| Local Docker Compose | `http://localhost:3000` |
| Cloud Run (PaaS) | `https://travelmanager-*.run.app` |
| Compute Engine (IaaS) | `https://<domain>` |

**Workload shapes:**

| Shape | Description |
|---|---|
| **Flat** | Constant load: `--users 100 --spawn-rate 10 --run-time 5m` |
| **Periodic** | Business-hours pattern: 4 cycles × 60 s ramp 20→100→20 users (16 min total) |
| **Spike** | Sudden burst: baseline → 500 users peak → recovery (~5 min). `SPIKE_PEAK=2000` for stress tests |

**User types:**

| Class | Weight | Behaviour |
|---|---|---|
| `BrowsingUser` | 3 | Anonymous: `GET /trips/all`, search, destinations, likes |
| `AuthedUser` | 1 | Authenticated via Firebase REST sign-in; creates/edits/deletes trips, likes, reviews |

### Running

```bash
# Seed test data
cd tests/load
python seed_users.py --count 50
python seed_trips.py --trips-per-user 5

# Headless run (flat shape)
locust -f locustfile.py --host https://travelmanager-*.run.app \
  --users 100 --spawn-rate 10 --run-time 5m \
  --headless --html reports/cloudrun_flat.html --csv reports/cloudrun_flat

# Periodic shape
LOCUST_SHAPE=periodic locust -f locustfile.py \
  --host https://travelmanager-*.run.app \
  --headless --html reports/cloudrun_periodic.html

# Compare all targets
./run_compare.sh 100 10 5m flat
```

### Results – Cloud Run vs. Kubernetes (GKE)

> Run periodic load test (100 peak users, 5 min) against both environments.

| Metric | Cloud Run | Kubernetes |
|---|---|---|
| Median response time (ms) | _to be filled_ | _to be filled_ |
| 95th percentile (ms) | _to be filled_ | _to be filled_ |
| Requests/s (peak) | _to be filled_ | _to be filled_ |
| Error rate (%) | _to be filled_ | _to be filled_ |
| Cold start observed | yes (min=0) | no (always-on) |
| Scale-out latency | ~2–5 s | ~30–60 s (HPA) |

**Key observations:**
- Cloud Run scales to zero; first request after idle incurs a cold start penalty (~2–5 s for this image).
- Kubernetes (HPA) has higher steady-state resource cost but no cold starts; scale-out is slower.
- For bursty, unpredictable traffic Cloud Run is more cost-efficient; for stable high-throughput workloads GKE is preferable.

> Fill in measured values after running `./run_compare.sh` and attach the HTML reports.
