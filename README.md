# TravelManager

**A social travel-planning platform, offered as a B2B SaaS product.**
Built for the Cloud Application Development course at HTWG Konstanz (Summer Term 2026).

**Team:** Kai Cikoglu · Nina Karl · Johanna Prinz · Daniel Rill

---

## What it does (in plain words)

TravelManager helps travellers plan trips, share them, and stay safe while travelling.
It is sold to businesses (B2B) on three plans — **Free**, **Standard**, and **Enterprise** —
each unlocking more features.

It has four main areas:

| Area | What it does for the user |
|---|---|
| **Trip Management** | Plan trips with multiple stops and dates, save travel plans, write reviews, like trips, and search live flights / hotels / buses. |
| **Social** | A personalized **live feed** of trips from people you follow, plus a weekly **email newsletter**. |
| **Travel Information** | Automatically checks official **travel warnings** (e.g. natural disasters, unrest) and **weather** against your booked trips, and **warns you** if something affects your plans. |
| **Destination Management** | Lets travel destinations (hotels, regions) buy anonymized traveller data for marketing — an Enterprise feature. |

### The three plans

| Plan | Price | Service level | Extra features |
|---|---|---|---|
| **Free** | free | best effort | core trip planning |
| **Standard** | paid | guaranteed (SLA) | personalized feed + newsletter, white-labelling (own logo/colours) |
| **Enterprise** | premium | guaranteed (SLA) | everything + B2B destination data access |

---

## How it is built (the short version)

Instead of one big program, the system is split into **small independent services**
("microservices"), each owning one job and its own database. Users never talk to them
directly — every request goes through a single front door (the **API Gateway**), which
checks who you are, which plan you have, and routes the request.

Some work is too slow to do while the user waits (building feeds, scanning travel
warnings for thousands of trips, sending emails). That work runs **in the background**:
a service publishes an event, and a separate **worker** picks it up later. This keeps the
app fast and lets the heavy work scale on its own.

```
   Traveller / Business
          │
          ▼
   ┌──────────────┐   checks login, plan, rate limits
   │ API Gateway  │   then forwards to the right service
   └──────┬───────┘
          │
   ┌──────┼─────────┬──────────────┬───────────────┬────────────────┐
   ▼      ▼         ▼              ▼               ▼                ▼
  user   trip   destination     social        travel-info     notification
 service service  service       service         service          service
                              (background)    (background)      (background)
          │                        ▲                │                ▲
          └─── events (Pub/Sub) ───┴────────────────┴────────────────┘
                e.g. "new trip", "travel alert", "newsletter ready"
```

Each service has its own database. Background services can be **paused, resumed, and
monitored** through a `/api/control` endpoint.

**Main technologies:** Node.js + Nuxt 3 (web app), PostgreSQL (data), Firebase (login),
Google Cloud Pub/Sub (background events), Kubernetes on Google Cloud (GKE), Terraform +
Helm (infrastructure as code), GitHub Actions (automated deployment), Locust (load tests).

---

## Documentation

| Document | What's in it |
|---|---|
| [`docs/CLOUD_PROJECT_DOCUMENTATION.md`](docs/CLOUD_PROJECT_DOCUMENTATION.md) | **The rubric-aligned deliverable** (§1 Requirements → §4 Performance) — system context, domain model, runtime/microservices, datastores + ER, roles, IaC, pipelines, perf. Presentation source. |
| [`docs/SOFTWARE_ARCHITECTURE.md`](docs/SOFTWARE_ARCHITECTURE.md) | The Cloud Project Software Architecture Document — design, services, 12-Factor mapping, infrastructure. |
| [`docs/MILESTONE2_SUBMISSION.md`](docs/MILESTONE2_SUBMISSION.md) | The single Milestone-2 deliverable: every requirement mapped to where it's implemented, plus the manual Google Cloud setup. |
| [`docs/MILESTONE2_CHANGELOG.md`](docs/MILESTONE2_CHANGELOG.md) | What changed from Milestone 1 (monolith) to Milestone 2 (microservices). |
| [`docs/architecture/`](docs/architecture/) | The detailed C4 architecture diagrams (LikeC4), auto-published to GitHub Pages. |
| [`tests/load/reports/REPORT.md`](tests/load/reports/REPORT.md) | The performance / load-test report with results. |

---

## Running it locally

You only need [Docker](https://www.docker.com/products/docker-desktop/). No cloud
account or API keys required for the local run.

```bash
# Start the whole system (all services) locally
docker compose -f docker-compose.dev.yml up --build

# Try it
curl localhost:8080/api/destinations
```

Open **http://localhost:8080** in a browser.

### Optional: run on a real (local) Kubernetes cluster

```bash
brew install kind helm
./scripts/kind-up.sh        # builds the images and installs everything on a local cluster
# open http://localhost
kubectl get pods,svc,hpa,cronjob
```

### Deploying to Google Cloud

Fully automated through Terraform + Helm + GitHub Actions. Step-by-step setup
(including the one-time Google Cloud Console configuration) is in
[`docs/MILESTONE2_SUBMISSION.md` §9](docs/MILESTONE2_SUBMISSION.md).
