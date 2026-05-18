# Deploy + Load Test Runbook

Reproducible commands for pushing this branch to Cloud Run via Terraform, then
running the Locust load tests against it. Local docker-compose target works
the same way — swap the URL.

## 1. Prerequisites (one-time per workstation)

```bash
gcloud auth login
gcloud auth application-default login
docker info               # daemon must be running
terraform version         # >= 1.5
```

`terraform/terraform.tfvars` populated (copy from
`terraform/terraform.tfvars.example`):

- `project_id`, `region`, `db_password`
- `firebase_api_key`, `firebase_auth_domain`, `firebase_project_id`,
  `firebase_app_id`, `firebase_storage_bucket`

Firebase Auth → Authorized domains must include the Cloud Run hostname:
`https://travelmanager-343958666277.europe-west6.run.app`

## 2. Deploy to Cloud Run

One-shot script (recommended):

```bash
cd /Users/kaicikoglu/IdeaProjects/TravelManager
./scripts/deploy-cloud-run-paas.sh
```

The script does, in order:

1. `gcloud config set project / run/region`
2. `terraform init && validate`
3. `terraform apply -target=google_artifact_registry_repository.docker` — bootstrap AR repo
4. `gcloud auth configure-docker <region>-docker.pkg.dev`
5. `docker buildx build --platform linux/amd64 --push` — image to Artifact Registry
6. `terraform apply` — Cloud SQL, Cloud Run service, Secret Manager, IAM
7. `gcloud run services update` — force a fresh revision with the latest image and the Firebase env vars
8. Print Cloud Run URL

## 3. Manual fallback (when iterating on a single step)

```bash
cd /Users/kaicikoglu/IdeaProjects/TravelManager
PROJECT_ID="project-59d9fc88-ac5c-43c3-894"
REGION="europe-west6"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/travelmanager/app:latest"

# Rebuild + push
docker buildx build --platform linux/amd64 -t "$IMAGE_URI" --push .

# Apply infra
cd terraform
terraform apply -auto-approve

# URL
terraform output -raw cloud_run_url
```

## 4. Smoke checks

```bash
URL="https://travelmanager-343958666277.europe-west6.run.app"
curl -sI "$URL"                                       # HTTP/2 200
curl -s "$URL/api/destinations" | jq 'length'         # 15 (seeded on first request)
curl -s "$URL/api/trips/all" | jq 'length'            # 0 on a fresh DB
curl -s "$URL/api/trips/all?q=paris" | jq 'length'    # search must not 401
```

Browser: open `$URL` → register / sign in → land on `/trips` → create trip.

## 5. Load tests (Locust)

### Setup

```bash
cd tests/load
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # then set FIREBASE_API_KEY (= NUXT_PUBLIC_FIREBASE_API_KEY)
echo "TARGET_CLOUD_RUN=$URL" >> .env
```

### Seed Firebase users + trips (idempotent)

```bash
python seed_users.py                                  # 50 accounts → seeded_users.json
python seed_trips.py --count 3 --target "$URL"        # 3 trips/user via REST
curl -s "$URL/api/trips/all" | jq 'length'            # ≥ 150
```

`seeded_users.json` is required by the `AuthedUser` Locust class. Without it,
all authenticated VUs raise `seeded_users.json missing` on `on_start`.

### Sanity-check shape imports

```bash
LOCUST_SHAPE=periodic python -c "from locustfile import *; print('periodic OK')"
LOCUST_SHAPE=spike    python -c "from locustfile import *; print('spike OK')"
```

### Run profiles

Flat baseline (1 min smoke):

```bash
unset LOCUST_SHAPE
locust -f locustfile.py --host "$URL" \
  --users 20 --spawn-rate 5 --run-time 1m \
  --headless --html reports/smoke_cloudrun.html --csv reports/smoke_cloudrun
```

Periodic Workload (Ex5) — 4 cycles of 20→100→20 users, 16 min total:

```bash
LOCUST_SHAPE=periodic locust -f locustfile.py --host "$URL" \
  --headless --run-time 17m \
  --html reports/periodic_cloudrun.html --csv reports/periodic_cloudrun
```

Once-in-a-lifetime Spike (Ex5) — baseline 10 → burst 500 → recovery, ~6 min:

```bash
LOCUST_SHAPE=spike locust -f locustfile.py --host "$URL" \
  --headless --run-time 6m \
  --html reports/spike_cloudrun.html --csv reports/spike_cloudrun
```

Compare across all configured targets (`TARGET_LOCAL`, `TARGET_GCE`,
`TARGET_CLOUD_RUN` in `.env`):

```bash
./run_compare.sh 100 10 5m flat
./run_compare.sh _ _ _ periodic
./run_compare.sh _ _ _ spike
```

Reports land in `reports/<target>_<shape>_<ts>/`.

### Cleanup

```bash
python seed_trips.py --cleanup --target "$URL"
python seed_users.py --cleanup
```

## 6. Reading the reports

Each run dir contains:

- `report.html` — Locust UI dashboard (charts + per-endpoint stats)
- `stats_*.csv` — request stats, failures, exceptions, history
- `locust.log` — full run log

Fill numbers into `tests/load/reports/REPORT.md` Section 5 (Results) for the
final test protocol. Fill `<TBD>` cells from each report's aggregate row.

## 7. Common gotchas

| Symptom | Fix |
|---|---|
| `zsh: command not found: --users` after backslash newlines | Run as a single line, no `\` |
| `Unknown User(s):` from Locust | `LOCUST_SHAPE` left set from prior run; `unset LOCUST_SHAPE` |
| `seeded_users.json missing` from `AuthedUser` | Run `python seed_users.py` first |
| 401 on `/api/trips/all?q=…` | Pre-fix middleware regex — already fixed in this branch |
| Cloud Run revision boots but trips empty | Schema bootstrap is idempotent; check Cloud SQL connectivity in revision logs |
| Image works locally, fails on Cloud Run | Rebuild with `--platform linux/amd64` |

## 8. Teardown

```bash
cd terraform
terraform destroy
```
