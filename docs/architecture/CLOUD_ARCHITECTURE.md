# TravelManager — Cloud Project Software Architecture Document

**Milestone:** Cloud-native (Milestone 2)
**Status:** Draft — execution against this document is the work of tasks in `/Users/kaicikoglu/.claude/plans/that-has-to-be-golden-peach.md`.

---

## 1. Business context

TravelManager pivots from prototype to **B2B SaaS** with three plans:

| Plan | Price | SLA | Customisation | Target |
|---|---|---|---|---|
| **Free** | none | best-effort | none | individual travellers, evaluation |
| **Standard** | attractive | 99.5 % | white-label (logo, colors, custom domain) | SMB travel agencies, content creators |
| **Enterprise** | premium | 99.9 % | dedicated DB, SSO, custom workflows | corporate travel, large destinations |

This milestone implements **Standard** as the lead offering, with the technical foundation that scales to Free and Enterprise without re-architecting.

### Functional areas

- **Trip Management** — hygiene factor. Extended from Milestone 1 with end-date support and outbound events.
- **Social Interaction** — *mandated as its own microservice.* Live feed (Firestore fan-out-on-write) **and** weekly newsletter (Cloud Scheduler → Handlebars digest).
- **Travel Information** — new. Ingests GDACS, ReliefWeb, OpenWeather; matches against active trips; emits per-user alerts.
- **Destination Management** — new. Destination catalog, sellable products, B2B marketing API exposing **k-anonymized** traveller aggregates.

---

## 2. Functional decomposition

8 microservices, each its own Nitro (Node 22) app, deployable as an independent Kubernetes Deployment.

| # | Service | Responsibility | Plan-gated APIs |
|---|---|---|---|
| 1 | `bff-gateway` | Subdomain → tenant resolve, Firebase JWT verify, plan-feature gate, proxy `/api/*` to upstreams | admin: enterprise+admin |
| 2 | `identity-tenant` | Tenants, plans, white-label config, SSO config, user mirror | branding: standard; plan change: superadmin |
| 3 | `trip` | Trip CRUD, locations, travel-plans; emits `trip.created/updated/deleted` | — |
| 4 | `social` | Follow graph, fan-out-on-write feed, weekly newsletter, likes, reviews | newsletter: standard+ tenant |
| 5 | `travel-info` | Ingests warnings + weather, matches active trips, emits notifications | — |
| 6 | `destination` | Destination CRUD, product catalog, B2B traveller aggregates | products: standard; B2B insights: enterprise + role `destination_manager` |
| 7 | `booking-integrations` | RapidAPI proxies (Skyscanner, Booking.com, FlixBus) with Redis cache | — |
| 8 | `notification` | Email (SendGrid) + Web Push + in-app dispatch with idempotency on `eventId` | — |

The full C4 L1/L2/L3 graph is maintained in [`workspace.dsl`](./workspace.dsl) and rendered to GitHub Pages by `.github/workflows/likec4.yml`.

---

## 3. Logical view

```
                       acme.travelmanager.app
                                  │
                       ┌──────────▼──────────┐
                       │   ingress-nginx     │   wildcard cert (cert-manager)
                       │   + per-tenant      │
                       └──────────┬──────────┘
                                  │
                       ┌──────────▼──────────┐
                       │    bff-gateway      │   tenant resolve · JWT verify · plan gate
                       └──┬───┬───┬───┬───┬──┘
              ┌───────────┘   │   │   │   └──────────────┐
              ▼               ▼   ▼   ▼                  ▼
        identity-tenant   trip social destination  booking-integrations
              │               │   │   │                  │
              └─────► Postgres (per-service schema or per-tenant DB)
                                  │
                                  └────────► Firestore (likes, feed, reviews)
                                                            │
                                                            │
        ┌─── notification ◄── notification.requested ◄──────┴── travel-info ◄── GDACS / ReliefWeb / OpenWeather
        │                                                          ▲
        ▼                                                          │
       SendGrid / Web Push / in-app                          Cloud Scheduler
```

C4 L1 (System Context), L2 (Container), L3 (Component) views live in `workspace.dsl`.

---

## 4. Process view

### 4.1 Sync flow — create a trip

```
Browser → bff-gateway        Bearer <Firebase ID token>
        ├── resolveTenantFromHost(host)
        ├── authMiddleware → user
        ├── plan-gate check (free is fine; PUT branding would 403)
        └── proxy /api/trips → trip
                 ├── INSERT trips (per-tenant schema)
                 └── publish trip.created  ──────────────► Pub/Sub
                                                              │
                                                              ├── social-feed-fanout
                                                              ├── travel-info-match
                                                              └── destination-aggregator
```

### 4.2 Async flow — warning → user alert (end-to-end ≤ 30 s p95 target)

```
Cloud Scheduler ─(every hour)─► Pub/Sub travel-info.ingest.tick
                                       │
                                       ▼
                                 travel-info-ingest worker
                                       ├── fetch GDACS RSS
                                       ├── UPSERT travel_warnings
                                       └── publish travel.warning.published
                                                       │
                                                       ▼
                                             travel-info-match worker
                                                ├── JOIN active_trips ON country + date overlap
                                                ├── INSERT alert_log (idempotent)
                                                └── publish notification.requested
                                                                │
                                                                ▼
                                                       notification-dispatch worker
                                                          ├── lookup user prefs
                                                          ├── fan-out email/push/in_app
                                                          ├── INSERT delivery_log (PK eventId)
                                                          └── publish notification.delivered
```

### 4.3 Async flow — weekly newsletter

```
Cloud Scheduler (Mon 06:00) ─► newsletter.scheduled (per Std+ tenant)
                                     │
                                     ▼
                              social-newsletter worker (throttled 1k users/60s)
                                     ├── query last-week activity per follower
                                     ├── render Handlebars digest
                                     └── publish notification.requested {channel: [email]}
```

### 4.4 Control mechanisms (assignment-mandated)

| Mechanism | Implementation |
|---|---|
| **Retry** | Pub/Sub retry policy 10 s→600 s exp backoff, max 5 attempts; consumers idempotent on `eventId` |
| **Dead-letter** | every subscription has `<topic>.dlq` + `.dlq.drain` pull sub; `dlq-monitor` CronJob alerts above threshold |
| **Pause/Resume** | per-worker Helm value `worker.paused: true` OR admin API `POST /admin/workers/:name/pause` (enterprise+admin) — Pub/Sub buffers 7 d |
| **Replay** | `scripts/ops/replay_dlq.sh <topic>` pulls DLQ + republishes to source |
| **Observability** | Cloud Monitoring + Prometheus + Grafana dashboards; ServiceMonitor on every service; per-topic depth/ack/oldest panels |

---

## 5. Data view

### 5.1 Service-owned data

| Service | Postgres schema (or DB) | Firestore | Redis |
|---|---|---|---|
| identity-tenant | `identity` | — | — |
| trip | `trip` (per-tenant for Std; own DB for Ent; `trip_free` row-level for Free) | — | — |
| social | `social` | `feeds/`, `likes/`, `reviews/` | — |
| travel-info | `travel_info` | — | — |
| destination | `destination` | — | — |
| notification | `notification` | — | — |
| booking-integrations | — | — | `sky:*`, `booking:*` (24 h TTL) |
| bff-gateway | — | — | `tenant-plan:*` (60 s TTL) |

### 5.2 Multi-tenancy model (matches plan §4)

- **Free** — pooled into `<service>_free` schema with row-level `tenant_id` discriminator + Postgres RLS planned
- **Standard** — own schema `<service>_t_<tenantId>` on the shared instance; resolved by `packages/shared-db` from `event.context.tenantId`
- **Enterprise** — own Cloud SQL database (or dedicated instance via `enterprise_dedicated_instances` Terraform variable)

### 5.3 Event payload contract

Every Pub/Sub message conforms to a JSON Schema in `packages/shared-events/schemas/` and includes the standard envelope:

```json
{
  "eventId":    "uuid",
  "tenantId":   "string",
  "occurredAt": "ISO timestamp",
  "version":    1
}
```

Topic catalog: see [Section 6.2](#62-pubsub-topology).

---

## 6. Deployment view

### 6.1 Kubernetes layout

GKE Autopilot cluster in `europe-west1`, namespace topology:

| Namespace | Pods | Notes |
|---|---|---|
| `infra` | ingress-nginx, cert-manager, External Secrets Operator, kube-prometheus-stack, custom-metrics-stackdriver-adapter, tenant-operator | cluster-wide enablers |
| `shared-services` | every microservice (bff-gateway, identity-tenant, trip, social, travel-info, destination, booking-integrations, notification) | one Deployment per service, HPA-scaled |
| `free-tier` | shared trip + social + destination Deployments (row-level `tenant_id`) | quota 4 vCPU / 8 Gi |
| `tenant-<id>` (Std) | dedicated trip + social + destination | quota 2 vCPU / 4 Gi, ResourceQuota + LimitRange + NetworkPolicy (default-deny) |
| `tenant-<id>` (Ent) | same + dedicated DB | quota 8 vCPU / 16 Gi |

`tenant-operator` CronJob reconciles tenants from `identity-tenant` → `helm upgrade --install tenant-<id> tenant-bundle -n tenant-<id> --create-namespace`.

### 6.2 Pub/Sub topology

| Topic | Producer | Subscribers | DLQ |
|---|---|---|---|
| `trip.created` | trip | social-feed-fanout · travel-info-match · destination-aggregator | `trip.created.dlq` |
| `trip.updated` | trip | social-feed-fanout · travel-info-match | `trip.updated.dlq` |
| `trip.deleted` | trip | social-feed-cleanup · travel-info-cleanup | … |
| `social.activity` | social | social-feed-fanout | … |
| `travel.warning.published` | travel-info | travel-info-match | … |
| `travel.weather.snapshot` | travel-info | travel-info-match | … |
| `notification.requested` | travel-info · social · destination | notification-dispatch | … |
| `notification.delivered` | notification | (audit pull) | — |
| `newsletter.scheduled` | scheduler | social-newsletter | … |
| `tenant.plan.changed` | identity-tenant | bff-cache-invalidate · social · destination | … |
| `travel-info.ingest.tick` | scheduler | travel-info-ingest | … |
| `social.feed.cleanup.tick` | scheduler | social-feed-cleanup | … |
| `destination.aggregate.tick` | scheduler | destination-aggregate | … |

13 topics × push subscriptions to push endpoints inside the cluster via internal LB; pulled DLQ subscriptions for replay.

### 6.3 IaC layout

```
terraform/
  backend.tf               GCS remote state — bucket via -backend-config
  modules/
    gke/                   Autopilot cluster + VPC + Cloud NAT + Workload Identity
    pubsub/                topic + DLQ + push subs with retry & dead-letter policies
    memorystore/           Redis Standard 1 GB
    scheduler/             Cloud Scheduler jobs publishing to Pub/Sub topics
    artifact-registry/     One Docker repo per service
    cloudsql-multi/        Shared Postgres 16 + per-service DBs + per-tenant Enterprise instances
    iam/                   Workload Identity bindings, IAM role grants
  envs/
    staging/main.tf + pubsub.tf + scheduler.tf
    prod/main.tf
```

Helm:

```
deploy/helm/
  _template/               library chart — tm.deployment/service/hpa/sa/es/pdb/netpol/sm helpers
  <service>/               per-service charts depending on _template
  tenant-bundle/           umbrella per-tenant (trip + social + destination + quota + netpol)
  tenants/<id>.yaml        Per-tenant overrides
  tenant-operator/         CronJob that reconciles tenants -> namespaces
  dlq-monitor/             CronJob that alerts when DLQ depth > threshold
  observability/           kube-prometheus-stack + custom-metrics-stackdriver-adapter
  values/{staging,prod}.yaml
```

---

## 7. 12-Factor compliance

| Factor | Implementation |
|---|---|
| I — Codebase | Single mono-repo with npm workspaces; tag-based release versioning per service |
| II — Dependencies | Per-service `package.json`; `npm ci` in Docker; no system-package coupling |
| III — Config | Env vars only (`packages/shared-config` validates schema, fails fast); secrets via External Secrets Operator → GCP Secret Manager |
| IV — Backing services | Postgres, Redis, Firestore, Pub/Sub, SendGrid all reachable by env URL/handle |
| V — Build / Release / Run | GitHub Actions: build → tag image → helm release; immutable images |
| VI — Processes | All services stateless; PG/Firestore/Redis hold state |
| VII — Port binding | Each Nitro service binds `NITRO_PORT` (8080 in image) |
| VIII — Concurrency | Horizontal scaling via HPA (CPU + Pub/Sub queue depth via custom-metrics adapter) |
| IX — Disposability | `SIGTERM` → 30 s grace → Pub/Sub leases expire → message redelivered |
| X — Dev/Prod parity | `docker-compose.microservices.yml` mirrors the GKE topology with Pub/Sub emulator + Redis container |
| XI — Logs | stdout JSON → Cloud Logging via fluentbit |
| XII — Admin processes | K8s `Job` resources for migrations + DLQ replay scripts (`scripts/ops/`) |

---

## 8. SLA + observability

| Plan | Uptime SLO | Error budget (monthly) |
|---|---|---|
| Free | best-effort | n/a |
| Standard | 99.5 % | 3 h 39 min |
| Enterprise | 99.9 % | 43 min |

### SLIs

- `http_request_duration_seconds_bucket` per service (p50/p95/p99)
- `pubsub.googleapis.com/subscription/num_undelivered_messages` per subscription
- `kube_horizontalpodautoscaler_status_current_replicas` (scaling behaviour)
- Synthetic: `warning_to_alert_seconds` (k6 micro-benchmark)

### Dashboards

`deploy/helm/observability/dashboards/travelmanager-overview.json` — request rate per service, p95 latency, Pub/Sub backlog, HPA pod counts, DLQ depth table.

### Alerts

- DLQ depth > 50 (CronJob `dlq-monitor`)
- p95 latency > SLO target for any service (Prom AlertManager rule, planned)
- Pub/Sub oldest unacked > 5 min (AlertManager rule, planned)

---

## 9. Performance testing strategy

| Tool | Purpose | Files |
|---|---|---|
| Locust | User-journey load (browsing, authed, feed-heavy, warning storm, newsletter burst) | `tests/load/scenarios/` |
| k6 | Service-level micro-benchmarks with SLO thresholds | `tests/perf/k6/` |
| Seeders | Bulk dataset generation via `COPY FROM STDIN` | `tests/seed/` |

Profiles (`tests/seed/seed_run_all.sh`):

| Profile | Users | Trips | Warnings | Follows avg |
|---|---|---|---|---|
| small | 10k | 2k | 500 | 20 |
| medium | 100k | 50k | 10k | 50 |
| large | 1M | 500k | 50k | 50 |

Performance report template: `tests/load/reports/template.md`.

---

## 10. Local development

```bash
docker compose up --build
```

Brings up all 8 microservices on 8090–8097 + postgres + redis + Pub/Sub emulator. UI entrypoint: [http://localhost:8090](http://localhost:8090). The monolith was retired in Phase 7 (see §12.5). `SKIP_AUTH=1` set per-service for local; tenant defaults to `dev` (Enterprise plan).

---

## 11. Roadmap

| Phase | Item |
|---|---|
| v2 | Istio / ASM for mTLS + canary releases |
| v2 | ArgoCD GitOps replacing push-deploy workflows |
| v2 | KEDA for newsletter-worker scale-to-zero |
| v2 | PostGIS-based polygon matching in travel-info |
| v2 | Read-fan-in for celebrity accounts in social feed |
| v2 | Regional failover (active/active europe-west1 + us-east1) |
| v3 | BigQuery export for ad-hoc analytics + ML personalisation |

---

## 12.5 Cutover history

**Phase 7 — monolith retirement.** The original Nuxt 3 monolith (Cloud Run + Cloud SQL) was retired:

- `app/` + `nuxt.config.js` + `public/` → `services/bff-gateway/` (Nuxt SSR now serves both UI and the API-proxy routes)
- Root `server/` deleted — every route owned by a downstream microservice
- Root `Dockerfile` deleted
- `docker-compose.yml` rewritten as the single microservices compose file
- `terraform/main.tf` + `variables.tf` + `outputs.tf` archived under `archive/terraform-cloudrun/`
- `terraform_iaas/` archived under `archive/terraform_iaas/`

What replaces them: every service has its own Helm chart, its own Postgres schema (or DB for Enterprise tenants), its own Dockerfile, and its own deploy slot in GitHub Actions.

Result: zero parallel architectures — only the microservice stack runs.

## 13. References

- LikeC4 diagrams: `docs/architecture/workspace.dsl` (published to GitHub Pages by `.github/workflows/likec4.yml`)
- Implementation plan (this milestone): `/Users/kaicikoglu/.claude/plans/that-has-to-be-golden-peach.md`
- Service-level READMEs: `services/*/README.md`
- Ops runbooks: `scripts/ops/README.md`
- Local dev: `scripts/local/README.md`
- Helm charts: `deploy/helm/README.md`
