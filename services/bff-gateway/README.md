# bff-gateway service

Edge service: tenant resolution from subdomain, Firebase JWT verify, plan-feature gates, then proxies `/api/*` to upstream microservices via internal cluster DNS.

## Phase status

Phase 1 (now): API proxy + tenant resolver + plan-cache + Firebase JWT — no Vue/Nuxt SSR.
Phase 6 cutover: monolith Nuxt SSR (current `app/` + `nuxt.config.js`) is moved into this service. The Phase-1 proxy routes are kept; only the page rendering layer is added. Until cutover, the monolith Cloud Run service handles the SSR side.

## Env

| var | required | example |
|---|---|---|
| `TRIP_SERVICE_URL` | yes | `http://trip.shared-services.svc.cluster.local` |
| `IDENTITY_TENANT_URL` | yes | `http://identity-tenant.shared-services.svc.cluster.local` |
| `SOCIAL_SERVICE_URL` | yes | `http://social.shared-services.svc.cluster.local` |
| `TRAVEL_INFO_SERVICE_URL` | yes | `http://travel-info.shared-services.svc.cluster.local` |
| `DESTINATION_SERVICE_URL` | yes | `http://destination.shared-services.svc.cluster.local` |
| `BOOKING_INTEGRATIONS_URL` | yes | `http://booking-integrations.shared-services.svc.cluster.local` |
| `NOTIFICATION_SERVICE_URL` | yes | `http://notification.shared-services.svc.cluster.local` |
| `REDIS_URL` | recommended | for plan cache |

## Tenant resolution

`Host: acme.travelmanager.app` → `event.context.tenant = { tenantId: 'acme', plan: 'standard' }`. Plan looked up from `identity-tenant` (60 s cache).
