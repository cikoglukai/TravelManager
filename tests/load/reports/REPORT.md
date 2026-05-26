# TravelManager — Load Test Report

This report documents the load tests run against TravelManager and their results.
All numbers below are read directly from the Locust `*_stats.csv` aggregates in this
directory (the matching `*.html` dashboards are committed alongside).

> **Scope note.** These runs benchmark three **deployment models** of the application —
> local docker-compose, a single GCE VM (IaaS), and Cloud Run (PaaS) — and are used as
> the cost/performance comparison baseline. The Milestone-2 microservice stack on GKE
> reuses the same Locust scripts; GKE worker autoscaling under the async-flood workload
> is observed qualitatively via `kubectl get hpa` and the per-worker `/api/control`
> endpoints (see §6).

## 1. Methodology

| | |
|---|---|
| Tool | Locust 2.x — `tests/load/locustfile.py` |
| User classes | `BrowsingUser` (anonymous, weight 3), `AuthedUser` (Firebase-signed-in, weight 1) |
| Token flow | Firebase REST `signInWithPassword` per VU on `on_start`; refresh 5 min before expiry |
| Seeded users | `seed_users.py` → `seeded_users.json` (count = `TEST_USER_COUNT`) |
| Seeded data | `seed_trips.py` → 3 trips/user; `seed_bulk_trips.py` for large-volume runs |
| Targets | local docker-compose, GCE VM (IaaS), Cloud Run (PaaS) |

## 2. Scenarios

### 2.1 Smoke (flat baseline)
Constant low load, short duration. Confirms the target is healthy and measures
steady-state latency with no autoscaling pressure.

### 2.2 Periodic Workload
`shapes/periodic.py` · 4 cycles × 240s · trough 20 users → peak 100 users.
Stresses autoscaling cooldown / scale-down behaviour.

| Phase | Time | Users |
|---|---|---|
| Ramp up | 0–60s | 20 → 100 |
| Hold peak | 60–120s | 100 |
| Ramp down | 120–180s | 100 → 20 |
| Hold trough | 180–240s | 20 |

### 2.3 Once-in-a-lifetime Workload (spike)
`shapes/spike.py` · 5 stages · sudden burst from 10 → 500 users.

| Stage | Time | Users | Spawn rate |
|---|---|---|---|
| Baseline | 0–60s | 10 | 5 |
| Spike | 60–90s | 10 → 500 | 50 |
| Hold burst | 90–210s | 500 | — |
| Drop | 210–270s | 500 → 10 | 50 |
| Recovery | 270–330s | 10 | 5 |

### 2.4 2000-user stress (scalability ceiling)
Periodic and constant shapes pushed to 2000 concurrent users to find the saturation
point of each deployment model.

## 3. Infrastructure parameters

### 3.1 Cloud Run (PaaS) — `terraform/`

| Parameter | Value | Source |
|---|---|---|
| min instances | 0 | `terraform/variables.tf` `cloud_run_min_instances` |
| max instances | 3 | `terraform/variables.tf` `cloud_run_max_instances` |
| Concurrency / instance | 80 (Cloud Run default) | service config |
| CPU / mem per instance | 1 vCPU / 512 MiB (Cloud Run v2 default) | service config |
| DB tier | `db-f1-micro` | `terraform/variables.tf` `cloud_sql_tier` |
| Region | `europe-west6` | `terraform/terraform.tfvars` |

### 3.2 Compute Engine (IaaS) — `terraform_iaas/`

| Parameter | Value |
|---|---|
| Machine type | `e2-standard-4` |
| vCPU / RAM | 4 vCPU / 16 GB |
| Region / zone | `europe-west3` / `europe-west3-a` |
| OS image | Container-Optimized OS (Docker host) |
| Postgres deploy | container on same VM (Postgres 16 alpine) |
| LB / autoscaler | none — single VM |

## 4. Execution

```bash
# Prep (once per Firebase project)
python seed_users.py
python seed_trips.py --count 3 --target $TARGET_LOCAL

# Smoke / periodic / spike across all targets
./run_compare.sh 100 10 5m flat
./run_compare.sh _ _ _ periodic
./run_compare.sh _ _ _ spike
```

Each run writes `<target>_<shape>.html` + `*_stats.csv` (+ `_failures`, `_exceptions`,
`_stats_history`) + `*.log` into this directory.

## 5. Results

Latencies in ms. RPS = aggregate mean requests/s over the run. Failure % =
failure-count ÷ request-count. Max = slowest single request (worst-case tail).

### 5.1 Smoke (flat baseline)

| Target | Median | p95 | p99 | RPS | Failures % | Max | Requests |
|---|---|---|---|---|---|---|---|
| local | — | — | — | — | — | — | (not run) |
| GCE (IaaS) | 61 | 220 | 400 | 9.0 | 0.00% | 12 150 | 523 |
| Cloud Run (PaaS) | 44 | 99 | 200 | 8.8 | 0.00% | 11 880 | 524 |

Both targets healthy at low load. Cloud Run's lower median/p95 reflects a warm
single instance; the ~12 s max on both is the first-request cold path (TLS + token
verify + first DB connection).

### 5.2 Periodic Workload (20 ↔ 100 users)

| Target | Median | p95 | p99 | RPS | Failures % | Max | Requests |
|---|---|---|---|---|---|---|---|
| local | 10 | 60 | 91 | 26.0 | 0.04% | 28 734 | 24 967 |
| GCE (IaaS) | 71 | 350 | 650 | 10.8 | 0.31% | 50 044 | 22 975 |
| Cloud Run (PaaS) | 55 | 140 | 220 | 25.2 | 0.53% | 969 | 24 155 |

Cloud Run holds a tight tail (p99 220 ms, max < 1 s) because it scales out under the
peak. The single GCE VM saturates at the 100-user peak — p99 650 ms and a 50 s
worst-case request — and sustains less than half the throughput. Local has the lowest
latency (no network) but cannot autoscale.

### 5.3 Once-in-a-lifetime Spike (10 → 500 users)

| Target | Median | p95 (spike) | p99 | RPS | Failures % | Max | Requests |
|---|---|---|---|---|---|---|---|
| local | 840 | 2 500 | 4 200 | 71.0 | 0.04% | 14 264 | 23 428 |
| GCE (IaaS) | 140 | 1 700 | 5 100 | 84.2 | 0.09% | 6 700 | 27 830 |
| Cloud Run (PaaS) | 160 | 2 100 | 5 600 | 82.8 | 0.10% | 49 003 | 27 350 |

All three survive the burst with < 0.2% failures. GCE actually edges Cloud Run on
median/p95 here because it is already warm at 4 vCPU, whereas Cloud Run pays
cold-start cost while spawning instances — visible as its 49 s worst-case during the
ramp. Local degrades most (median 840 ms) as the burst exceeds one machine's cores.

### 5.4 2000-user stress (saturation)

| Target | Shape | Median | p95 | p99 | RPS | Failures % | Max | Requests |
|---|---|---|---|---|---|---|---|---|
| GCE (IaaS) | periodic | 530 | 58 000 | 110 000 | 35.6 | 0.08% | 167 718 | 34 240 |
| Cloud Run (PaaS) | periodic | 690 | 87 000 | 146 000 | 23.6 | 1.41% | 186 049 | 22 628 |
| GCE (IaaS) | stress | 880 | 31 000 | 77 000 | 74.0 | 0.34% | 147 566 | 24 385 |
| Cloud Run (PaaS) | stress | 690 | 51 000 | 98 000 | 30.9 | 0.52% | 154 075 | 10 190 |

At 2000 users both models are past saturation — p95 in the tens of seconds, max
~3 min. Failures stay low (queued, not dropped) but latency is unusable. IaaS holds
higher throughput (capped 3-instance Cloud Run can't keep up), while Cloud Run shows
higher failure rates as request queues overflow. This marks the practical ceiling for
both single-VM IaaS and the demo's 3-instance Cloud Run cap.

## 6. Findings

- **IaaS saturation.** The single `e2-standard-4` VM is fine to ~100 concurrent users
  (periodic p99 650 ms) but its tail explodes well before 2000 (p95 58 s). No
  horizontal scaling — vertical only.
- **PaaS cold start.** Cloud Run's cost is the first-request cold path (smoke/spike
  max 12–49 s) and the demo `max_instance_count = 3` cap, which becomes the bottleneck
  at high load. Steady-state warm latency is the best of the three (smoke p95 99 ms).
- **Autoscaling lag during spike.** Cloud Run trails warm GCE through the 10 → 500
  ramp because instances spawn reactively; once warm it matches IaaS throughput.
- **Failures stay low until 2000 users**, where Cloud Run's queue overflow (1.4%)
  beats the single VM's (0.08–0.34%) only on tail latency, not error rate.
- **DB pool.** `pg` Pool default = 10 per process; no pool-exhaustion errors observed
  below 2000 users.
- **GKE (M2).** The microservice stack adds HPAs on sync services and independent
  worker Deployments. Under `async_flood.py` (TripCreated → feed build + warning
  diff), worker scale-out is confirmed via `kubectl get hpa` and the processed-count /
  lag fields on each worker's `GET /api/control`. A full GKE latency table is future
  work — the deployment-model comparison above is the submitted quantitative baseline.

## 7. Reproducibility

All test code under `tests/load/`. Lock file at `tests/load/requirements.txt`.
Targets selected via `.env` (`TARGET_LOCAL`, `TARGET_GCE`, `TARGET_CLOUD_RUN`).
The committed `*.html` dashboards and `*_stats.csv` files in this directory are the
raw output behind every number above.
