# Locust Load Tests — TravelManager

Drives traffic against TravelManager API across three deploy targets (local, Cloud Run, Compute Engine) for performance comparison.

## Setup

```bash
cd tests/load
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill FIREBASE_API_KEY (= NUXT_PUBLIC_FIREBASE_API_KEY)
# Either:
#   (a) set FIREBASE_SERVICE_ACCOUNT_PATH to your Admin SDK JSON, OR
#   (b) if org policy blocks key creation: leave path blank, set
#       NUXT_PUBLIC_FIREBASE_PROJECT_ID, then run:
#         gcloud auth application-default login
#         gcloud config set project <PROJECT_ID>
# Set TARGET_CLOUD_RUN / TARGET_GCE if running compare script
```

## Seed test users (one-shot per Firebase project)

```bash
python seed_users.py            # creates TEST_USER_COUNT accounts → seeded_users.json
python seed_users.py --cleanup  # deletes them all
```

Idempotent — re-running is safe.

## Seed test trips (one-shot per target)

Browsing scenario reads `/api/trips/all`; without trips the response is empty and
results are not representative. Run after `seed_users.py`:

```bash
python seed_trips.py --count 3 --target $TARGET_LOCAL    # 3 trips/user
python seed_trips.py --cleanup --target $TARGET_LOCAL    # remove them
```

Trips are titled `Seed Trip NNN — <city>` so they are easy to recognise and
prune. Re-running first deletes prior seed trips per user, so the configured
count is exact.

## Run

Interactive UI:
```bash
locust -f locustfile.py --host http://localhost:3000
# open http://localhost:8089
```

Headless flat profile:
```bash
locust -f locustfile.py --host $TARGET \
  --users 100 --spawn-rate 10 --run-time 5m \
  --headless --html reports/run.html --csv reports/run
```

Workload shapes (Ex5):
```bash
LOCUST_SHAPE=periodic locust -f locustfile.py --host $TARGET \
  --headless --html reports/periodic.html --csv reports/periodic
LOCUST_SHAPE=spike    locust -f locustfile.py --host $TARGET \
  --headless --html reports/spike.html    --csv reports/spike
```

`periodic` runs 16 min — 4 cycles ramping 20→100→20 users, exercises
autoscaling cooldown.
`spike` runs ~5 min 30 — flat baseline, sudden burst to 500 users, recovery —
exercises cold-start / scale-out under sudden demand.

Compare all configured targets with one command:
```bash
./run_compare.sh 100 10 5m flat       # default; reports in reports/<target>_flat_<ts>/
./run_compare.sh _ _ _ periodic       # shape ignores users/spawn args
./run_compare.sh _ _ _ spike
```

## User classes

- `BrowsingUser` (weight=3) — anonymous, hits public endpoints (`/api/trips/all`, `/api/destinations`, `GET /api/likes/trip/:id`)
- `AuthedUser` (weight=1) — signs in via Firebase REST, exercises trip CRUD, likes, reviews

## Token-less smoke option

To bypass Firebase entirely against the local target, start Nuxt with `SKIP_AUTH=1` (non-prod only — see `server/middleware/auth.ts:18`). All `AuthedUser` calls succeed without sign-in. Useful for measuring app code path without Firebase RTT.

## Cleanup

```bash
python seed_users.py --cleanup
# Manually prune trips created during run from Postgres / Firestore likes if needed
```
