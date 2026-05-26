# Performance test report — <YYYY-MM-DD>

## Scenario

- **Workload**: <e.g. browsing + authenticated + feed-heavy>
- **Shape**: <periodic | spike | sustained | flat>
- **Dataset profile**: <small | medium | large> (`tests/seed/seed_run_all.sh`)
- **Target env**: <staging | prod>
- **Duration**: <minutes>
- **Peak VU count**: <number>

## SLO targets

| Metric | Target |
|---|---|
| Read p95 | < 300 ms |
| Write p95 | < 800 ms |
| End-to-end warning → alert p95 | < 30 s |
| Error rate | < 1 % |
| Newsletter completion (100k users) | < 10 min |

## Results

| Endpoint | Method | p50 | p95 | p99 | RPS | Errors |
|---|---|---|---|---|---|---|
| `/api/trips` | GET | | | | | |
| `/api/trips` | POST | | | | | |
| `/api/feed` | GET | | | | | |
| `/api/alerts/me` | GET | | | | | |

## Async pipeline

- Pub/Sub backlog peak: <messages> on `<subscription>`
- Worker HPA scale: min → peak pods
- DLQ depth peak: <messages>
- End-to-end fan-out (warning_storm): p50/p95/p99 seconds

## Resource utilization

| Service | CPU peak | Mem peak | Replicas (min→peak) |
|---|---|---|---|
| bff-gateway | | | |
| trip | | | |
| social | | | |
| travel-info | | | |
| notification | | | |

## Findings

- Bottleneck:
- Action items:
- Cost: $/M req estimate

## Attachments

- locust HTML report: `tests/load/reports/<date>-locust.html`
- k6 JSON output:    `tests/load/reports/<date>-k6.json`
- Grafana screenshots: `tests/load/reports/<date>/grafana/`
