# trip service

Owns: PostgreSQL trip schema (users, trips, plan_locations, travel_plans). Emits `trip.created`, `trip.updated`, `trip.deleted`.

## Env

| var | required | example |
|---|---|---|
| `DATABASE_URL_TRIP` | yes | `postgresql://trip-svc@/trip?host=/cloudsql/<conn>` |
| `GOOGLE_CLOUD_PROJECT` | yes | `travelmanager-prod` |
| `FIREBASE_SERVICE_ACCOUNT` | dev only | JSON SA key |
| `SKIP_AUTH` | dev only | `1` to bypass Firebase JWT |
| `PUBSUB_PUSH_AUDIENCE` | when consuming | service URL |

## Routes

| method | path | description |
|---|---|---|
| GET  | `/api/health` | DB ping |
| GET  | `/api/trips` | own trips |
| GET  | `/api/trips/all?q=` | public search |
| POST | `/api/trips` | create (emits `trip.created`) |
| GET  | `/api/trips/:id` | detail |
| PUT  | `/api/trips/:id` | update (emits `trip.updated`) |
| DELETE | `/api/trips/:id` | delete (emits `trip.deleted`) |
| GET  | `/api/locations/trip/:tripId` | list locations |
| POST | `/api/locations/trip/:tripId` | add location (emits `trip.updated`) |

## Migrations

```bash
DATABASE_URL_TRIP=... npm run migrate
```

## Local

```bash
npm install
DATABASE_URL_TRIP=postgresql://postgres:postgres@localhost:5433/trip \
GOOGLE_CLOUD_PROJECT=local SKIP_AUTH=1 npm run dev
```
