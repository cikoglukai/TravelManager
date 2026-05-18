# TravelManager

Social travel-management SaaS. Built as part of HTWG Konstanz Cloud Application Development (Milestone 2: Cloud-native).

**Team:** Kai Cikoglu, Nina Karl, Johanna Prinz, Daniel Rill

---

## Architecture

8-service mono-repo, 12-Factor compliant, deployed to GKE Autopilot via Terraform + Helm.

```
                       acme.travelmanager.app
                                  │
                       ingress-nginx + cert-manager
                                  │
                              bff-gateway   ──── tenant resolve, plan-feature gate
                          ┌───┬─┴─┬───┬───┬───┐
                          ▼   ▼   ▼   ▼   ▼   ▼
                 identity  trip social travel destination booking notification
                  -tenant            -info               -integrations
                          └──── Pub/Sub (10+ topics, DLQ + retry policy) ────┘
                          └──── Cloud SQL · Firestore · Memorystore Redis ───┘
```

See [`docs/architecture/CLOUD_ARCHITECTURE.md`](docs/architecture/CLOUD_ARCHITECTURE.md) for the full architecture document (C4 views, 12F table, SLA matrix, Pub/Sub topology). LikeC4 diagrams in [`docs/architecture/workspace.dsl`](docs/architecture/workspace.dsl) — auto-published to GitHub Pages.

## Local development

```bash
docker compose up --build
```

Brings up postgres + redis + Pub/Sub emulator + all 8 microservices. UI at [http://localhost:8090](http://localhost:8090). Per-service health endpoints:

| Port | Service |
|---|---|
| 8090 | bff-gateway (Nuxt SSR — entrypoint) |
| 8091 | identity-tenant |
| 8092 | trip |
| 8093 | booking-integrations |
| 8094 | social |
| 8095 | travel-info |
| 8096 | destination |
| 8097 | notification |

```bash
# Quick smoke check
for p in 8090 8091 8092 8093 8094 8095 8096 8097; do curl -s http://localhost:$p/api/health; echo; done
```

`SKIP_AUTH=1` is set on every service in compose — Firebase JWT verification is bypassed locally; tenant defaults to `dev` (Enterprise plan) so all plan-gated endpoints work.

## Repo layout

```
services/        8 microservices (bff-gateway, identity-tenant, trip, social, travel-info, destination, booking-integrations, notification)
packages/        shared-auth · shared-events · shared-db · shared-config
deploy/helm/     per-service charts + tenant-bundle + tenant-operator + dlq-monitor + observability
terraform/       backend.tf · modules/{gke,pubsub,memorystore,scheduler,artifact-registry,cloudsql-multi,iam} · envs/{staging,prod}
tests/load/      Locust scenarios + shapes (browsing, authed, feed, warning storm, newsletter burst)
tests/perf/k6/   Service-level micro-benchmarks
tests/seed/      Bulk seeders + scale profiles
docs/architecture/  Cloud architecture doc + LikeC4 workspace
archive/         Monolith Terraform + IaaS Terraform (historical, not wired)
```

## SaaS plans

| Plan | Price | SLA | Customisation |
|---|---|---|---|
| Free | — | best-effort | none |
| Standard | attractive | 99.5 % | white-label (logo, colors, custom domain), newsletter, destination products |
| Enterprise | premium | 99.9 % | dedicated DB, SSO, B2B insights dashboard, custom workflows |

## Features

- **Trip management** — CRUD, locations with date ranges, travel plans
- **Social** — personalized live feed (Insta-style fan-out-on-write), follow graph, weekly newsletter, likes, comments
- **Travel information** — automatic ingestion from GDACS · ReliefWeb · OpenWeather; per-trip alerts via Pub/Sub
- **Destination management** — catalog of cities/routes/transport/accommodation, sellable products, B2B traveller-insights dashboard (k-anonymized)
- **Multi-tenant SaaS** — Free / Standard / Enterprise plans with namespace-per-tenant isolation
- **White-labelling** — Standard+ tenants customise branding + custom domain
- **Async control** — DLQ monitor, replay scripts, admin pause API (Enterprise)

## CI/CD

- `.github/workflows/ci.yml` — lint + typecheck + unit tests + Docker build on PR
- `.github/workflows/cd-staging.yml` — push to `main` → build images → Helm deploy to staging GKE
- `.github/workflows/cd-prod.yml` — tag `v*` → manual approval → production rollout
- `.github/workflows/terraform.yml` — PR plan + main apply
- `.github/workflows/loadtest-nightly.yml` — nightly Locust run against staging
- `.github/workflows/likec4.yml` — auto-publish architecture diagrams to GitHub Pages

## Documentation history

Phase 7 cutover removed the original Cloud Run monolith. Historical docs (`IMPLEMENTATION.md`, `CloudRun.md`, `DEPLOYMENT_*.md`, `LOCUST_SETUP.md`) describe earlier deployments and are kept for reference; the live architecture is in `docs/architecture/CLOUD_ARCHITECTURE.md`.
