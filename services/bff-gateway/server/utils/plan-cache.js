// BFF-side plan cache. Reads via identity-tenant service (HTTP) and caches per tenant id.
// Backed by Redis when REDIS_URL is set; otherwise in-process Map (single-replica dev).

import Redis from 'ioredis'

let _redis = null
const _memory = new Map()
const TTL_SECONDS = 60

function redis() {
  if (_redis !== null) return _redis
  const url = process.env.REDIS_URL
  if (!url) { _redis = false; return null }
  _redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 })
  _redis.on('error', (e) => console.error('[bff][redis] error:', e.message))
  return _redis
}

export async function getPlanForTenant(tenantId) {
  const key = `tenant-plan:${tenantId}`
  const r = redis()
  if (r) {
    const hit = await r.get(key)
    if (hit) return hit
  } else {
    const hit = _memory.get(tenantId)
    if (hit && hit.expiresAt > Date.now()) return hit.plan
  }

  // Source of truth: identity-tenant HTTP API. Skip on dev/local — return 'free'.
  const url = process.env.IDENTITY_TENANT_URL
  let plan = 'free'
  if (url) {
    try {
      // Use Host header so identity-tenant resolves the same tenant.
      const resp = await fetch(`${url}/api/tenants/me`, {
        headers: { host: `${tenantId}.travelmanager.app`, 'x-tenant-id': tenantId },
      })
      if (resp.ok) {
        const json = await resp.json()
        plan = json?.plan ?? 'free'
      }
    } catch (e) {
      console.warn(`[bff] plan lookup for ${tenantId} failed:`, e.message)
    }
  }

  if (r) await r.set(key, plan, 'EX', TTL_SECONDS)
  else _memory.set(tenantId, { plan, expiresAt: Date.now() + TTL_SECONDS * 1000 })
  return plan
}
