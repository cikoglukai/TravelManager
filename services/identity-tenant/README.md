# identity-tenant service

Source of truth for tenants, plans, white-label config, SSO config, user mirror. Emits `tenant.plan.changed`.

## Env

| var | required | example |
|---|---|---|
| `DATABASE_URL_IDENTITY` | yes | `postgresql://identity-svc@/identity?host=/cloudsql/<conn>` |
| `GOOGLE_CLOUD_PROJECT` | yes | for Pub/Sub |
| `SUPERADMIN_UID` | yes | Firebase UID allowed to PUT plans |

## Routes

| method | path | plan |
|---|---|---|
| GET  | `/api/health` | — |
| GET  | `/api/tenants/me` | free |
| PUT  | `/api/tenants/:id/branding` | standard (white-label feature gate) |
| PUT  | `/api/tenants/:id/plan` | superadmin only (emits `tenant.plan.changed`) |
| GET  | `/api/users/me` | free |

## Plan-gate

`PUT /api/tenants/:id/branding` wrapped with `requirePlan('standard', handler)` — Free tenants get 403.

## Cache

In-process `getPlanForTenant(tenantId)` 60 s TTL. Replace with shared Redis when running >1 replica.
