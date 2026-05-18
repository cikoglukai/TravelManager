// Tenant plan cache. Populated by tenant write paths and refreshed lazily on lookup miss.
// In production this is backed by Memorystore Redis (60 s TTL) — for v1 the in-process map is fine
// because identity-tenant is single-replica. For HA replace with shared Redis.

import { pool } from './db.js'

const _cache = new Map() // tenantId -> { plan, expiresAt }
const TTL_MS = 60_000

export async function getPlanForTenant(tenantId) {
  const now = Date.now()
  const hit = _cache.get(tenantId)
  if (hit && hit.expiresAt > now) return hit.plan

  const { rows } = await pool().query('SELECT plan FROM tenants WHERE id = $1', [tenantId])
  const plan = rows[0]?.plan ?? 'free'
  _cache.set(tenantId, { plan, expiresAt: now + TTL_MS })
  return plan
}

export function invalidate(tenantId) {
  _cache.delete(tenantId)
}
