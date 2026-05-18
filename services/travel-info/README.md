# travel-info service

Ingests external travel warnings (GDACS, ReliefWeb) + weather (OpenWeather), matches against active trips, emits `notification.requested` per match.

## Sources

- **GDACS** (`gdacs`) — RSS, public, no key, severity Green/Orange/Red → info/advisory/warning
- **ReliefWeb** (`reliefweb`) — JSON API, public, ongoing disasters
- **OpenWeather** (`openweather`) — `OPENWEATHER_API_KEY` required, 5-day forecast per active city

## Routes

| method | path |
|---|---|
| GET | `/api/health` |
| GET | `/api/warnings?country=&severity=` |
| GET | `/api/alerts/me` |
| POST | `/api/internal/pubsub/travel-info/ingest` (Pub/Sub push for `travel-info.ingest.tick`) |
| POST | `/api/internal/pubsub/travel-info/match` (Pub/Sub push for warning + trip.* events) |

## Tables

- `travel_warnings (source, source_id UNIQUE, country_iso2, severity, valid_from/to, raw_json)`
- `weather_snapshots (city, country_iso2, forecast_json)`
- `alert_log (user_uid, trip_id, warning_id UNIQUE)` — idempotency
- `active_trips` — denormalized trip cache for fast country+date matching, filled by `trip.*` consumers

## Env

| var | required | example |
|---|---|---|
| `DATABASE_URL_TRAVEL_INFO` | yes | per-service DB |
| `GOOGLE_CLOUD_PROJECT` | yes | for Pub/Sub publish |
| `OPENWEATHER_API_KEY` | for weather | OW free key |
| `PUBSUB_PUSH_AUDIENCE` | prod | OIDC audience |
| `SKIP_PUBSUB_VERIFY` | dev | `1` to skip OIDC |

## Triggering manually (dev)

```bash
# Force a GDACS ingest
curl -X POST http://localhost:8095/api/internal/pubsub/travel-info/ingest \
  -H 'content-type: application/json' \
  -d '{"message":{"data":"'"$(printf '%s' '{"eventId":"00000000-0000-0000-0000-000000000000","tenantId":"system","occurredAt":"2025-01-01T00:00:00Z","version":1,"source":"gdacs"}' | base64)"'"}}'
```
