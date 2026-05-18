# Locust Load Testing — Setup & Run Guide

End-to-end Anleitung für Locust-Lasttests gegen TravelManager. Ein einziges Setup, drei vergleichbare Targets: **lokales Docker Compose**, **Cloud Run**, **GCE VM**.

---

## 1. Voraussetzungen

- **Python 3.10+** empfohlen (3.9 läuft mit Warnungen)
- **gcloud CLI** installiert + bei deinem Account eingeloggt
- **Firebase-Projekt** existiert (Auth aktiviert, Web App registriert)
- IAM-Rolle `Firebase Authentication Admin` auf deinem Google-Account (zum Seeden der Test-User)

---

## 2. One-Time Setup

Im Projekt-Root ausführen.

### 2.1 Virtual env + dependencies

```bash
cd tests/load
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Bei jeder neuen Shell wieder `source .venv/bin/activate` ausführen.

### 2.2 Application Default Credentials (gcloud)

Org-Policy blockt Service-Account-Keys. Stattdessen ADC via gcloud:

```bash
gcloud auth application-default login
gcloud config set project <dein-project-id>
```

Browser öffnet → Google-Login → "Authenticated".

### 2.3 `.env` für Locust (`tests/load/.env`)

```bash
cat > .env <<'EOF'
FIREBASE_API_KEY=<dein-NUXT_PUBLIC_FIREBASE_API_KEY-aus-app/.env>
FIREBASE_SERVICE_ACCOUNT_PATH=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=<dein-firebase-project-id>
TEST_USER_COUNT=50
TEST_USER_PASSWORD=LoadTest!2026
TEST_USER_EMAIL_DOMAIN=travelmanager.test

LOCUST_HOST=http://localhost:3000

TARGET_LOCAL=http://localhost:3000
TARGET_CLOUD_RUN=https://<dein-cloud-run-host>
TARGET_GCE=
EOF
```

`FIREBASE_SERVICE_ACCOUNT_PATH` leer lassen → Script nutzt ADC. `TARGET_GCE` mit VM Public IP befüllen, sobald VM läuft (z.B. `http://34.65.x.x`).

### 2.4 Test-User in Firebase Auth seeden

```bash
python seed_users.py
```

Erwartung:
```
[i] Using Application Default Credentials (project=...)
[+] created loadtest-0000@travelmanager.test
...
Wrote 50 users to seeded_users.json
```

Sichtbar in Firebase Console → Authentication → Users.
Idempotent — bei Re-Run werden bestehende Accounts übersprungen.

**Cleanup nach allen Tests:**
```bash
python seed_users.py --cleanup
```

---

## 3. Smoke Check pro Target

Vor dem Lasttest sicherstellen, dass das Target lebt:

```bash
# Local (Docker Compose oben)
curl http://localhost:3000/api/trips/all

# Cloud Run
curl https://<dein-cloud-run-host>/api/trips/all

# GCE VM
curl http://<VM_PUBLIC_IP>/api/trips/all
```

Jeder soll JSON-Array zurückgeben (auch wenn leer: `[]`).

---

## 4. Locust ausführen

### 4.1 Interactive Web UI

```bash
cd tests/load
source .venv/bin/activate

# Target via --host wählen:
locust -f locustfile.py --host https://<dein-cloud-run-host>
```

Browser: **http://localhost:8089**

- **Number of users:** wie viele simultane VUs (Start: 10)
- **Spawn rate:** VUs/Sekunde (Start: 2)
- **Start**

Live-Stats: RPS, p50/p95/p99 latency, fail rate, charts. Stop = `Ctrl+C` im Terminal.

### 4.2 Headless Run (für Reports/CI)

```bash
locust -f locustfile.py --host $TARGET_URL \
  --users 100 --spawn-rate 10 --run-time 5m \
  --headless --html reports/run.html --csv reports/run
```

`reports/` enthält danach:
- `run.html` — interaktiver Bericht
- `run_stats.csv`, `run_failures.csv`, `run_stats_history.csv`

### 4.3 Drei Targets vergleichen

```bash
./run_compare.sh 50 5 3m   # users, spawn-rate, run-time
```

Nutzt `TARGET_LOCAL`, `TARGET_CLOUD_RUN`, `TARGET_GCE` aus `.env`. Leere überspringt es. Ergebnis: `reports/<target>_<timestamp>/report.html` für jedes Target — gleiche Last, vergleichbare Zahlen.

---

## 5. Was Locust testet

Zwei VU-Klassen, gewichteter Traffic-Mix:

**`BrowsingUser`** (weight=3, anonym) — public reads:
- `GET /api/trips/all`
- `GET /api/trips/all?q=<city>` (search)
- `GET /api/destinations`
- `GET /api/destinations/<id>/routes`
- `GET /api/likes/trip/<id>`

**`AuthedUser`** (weight=1, signed in via Firebase REST):
- Login on_start → JWT cached
- `POST /api/users` (upsert in Postgres)
- `GET /api/users/me`, `GET /api/trips`
- `POST /api/trips` → `POST /api/locations/trip/<id>` → `GET /api/trips/<id>`
- `POST /api/likes/trip/<id>` (mit comment)
- `PUT /api/trips/<id>`, `DELETE /api/trips/<id>` (eigene)
- `POST /api/reviews/trip/<id>` (auf andere)

VU-Verteilung: 75% browsing, 25% authed (entspricht typischer Web-App Read/Write Mix).

---

## 6. Empfohlene Lastprofile

| Profil | Users | Spawn rate | Duration | Zweck |
|---|---|---|---|---|
| Smoke | 10 | 2 | 1m | sanity, kein Throughput-Ziel |
| Baseline | 50 | 5 | 5m | normale Tagesnutzung |
| Stress | 200 | 20 | 10m | overload-Verhalten, cold-start Cloud Run |
| Spike | 500 | 100 | 2m | kurzer Burst, capacity check |

---

## 7. Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| `IsADirectoryError` beim seeden | leerer Path-String wird als `.` interpretiert | bereits gefixt — pull latest |
| 401 auf authed endpoints | Firebase ID-Token nicht gesendet oder expired | `on_start` prüfen, refresh-Logic in `auth.py` |
| 403 von `/api/reviews/...` | Reviewer = Trip-Owner | erwartet, Code filtert; bei zu wenig public trips bleibt task idle |
| 404 von `/api/trips/<id>` nach create | ID nicht in created_trip_ids | check Response-Body von POST in Locust UI |
| Cloud Run cold-start in p99 | erste 30s nach Start | Smoke run davor (siehe §3), dann eigentlicher Run |
| Firebase rate-limit (signin) | zu viele VUs auf einmal | spawn-rate runter, oder `wait_time` in `AuthedUser` hoch |

Detail-Logs:
```bash
locust ... --loglevel DEBUG --logfile reports/locust.log
```

---

## 8. Cleanup

```bash
# Test-User löschen
python seed_users.py --cleanup

# Erstellte Trips aus DB pruning (manuell)
# Postgres: DELETE FROM trips WHERE title LIKE 'Load Test Trip %';
# Firestore likes: collection 'likes' → manuell oder via Admin SDK
```

`reports/` und `seeded_users.json` liegen in `.gitignore`, kein manuelles Aufräumen nötig.

---

## 9. Datei-Layout

```
tests/load/
├── .env                       # nicht commited — pro Maschine
├── .env.example
├── .gitignore
├── README.md                  # kurz; diese Datei = ausführlich
├── auth.py                    # Firebase REST signin/refresh
├── locustfile.py              # entry point
├── requirements.txt
├── run_compare.sh             # 3-Target compare runner
├── scenarios/
│   ├── authenticated.py       # AuthedUser
│   └── browsing.py            # BrowsingUser
├── seed_users.py              # Firebase Auth seeder + cleanup
├── seeded_users.json          # generated, nicht commited
└── reports/                   # generated, nicht commited
```