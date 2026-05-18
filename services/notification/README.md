# notification service

Consumes `notification.requested`. Dispatches per-user across email (SendGrid), Web Push (placeholder), in-app (DB). Emits `notification.delivered` per successful channel.

## Env

| var | required | example |
|---|---|---|
| `DATABASE_URL_NOTIFICATION` | yes | per-service Cloud SQL DB |
| `GOOGLE_CLOUD_PROJECT` | yes | for Pub/Sub publish |
| `SENDGRID_API_KEY` | for email | SG key |
| `SENDGRID_FROM_EMAIL` | for email | `noreply@travelmanager.app` |
| `PUBSUB_PUSH_AUDIENCE` | prod only | service URL — OIDC token check |
| `SKIP_PUBSUB_VERIFY` | dev only | `1` to skip OIDC verify |

## Routes

| method | path | description |
|---|---|---|
| GET | `/api/health` | DB ping + sendgrid check |
| GET | `/api/notifications` | last 50 in-app for current user/tenant |
| PUT | `/api/preferences` | toggle email/push/in_app per user |
| POST | `/api/internal/pubsub/notification/dispatch` | Pub/Sub push handler for `notification.requested` |

## Idempotency

`delivery_log.event_id` PK — replay-safe.

## Tables

- `preferences (user_uid, tenant_id, ...)` — channel toggles
- `delivery_log (event_id, …, results_json)` — audit + dedupe
- `in_app_notifications (...)` — UI-facing inbox
- `suppressions` — bounce/unsubscribe list
- `users_cache` — local contact cache, refreshed by sync job (Phase 4 enhancement)
