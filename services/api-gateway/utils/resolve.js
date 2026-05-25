// Resolve a caller's tenant, plan and role from the User service. Cached per
// uid (60s) so we don't hit the User service on every request. The cache is
// capacity-bounded (rough LRU by insertion order) to avoid unbounded growth
// across many uids / token churn.
const cache = new Map()
const TTL_MS = 60_000
const MAX_ENTRIES = 50_000

export async function resolveTenantPlan(uid) {
  const hit = cache.get(uid)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  const userUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001'
  let tenantId = 'default'
  let role = 'traveler'
  let plan = 'free'

  try {
    const u = await $fetch(`/api/users/${uid}`, { baseURL: userUrl })
    tenantId = u.tenant_id || 'default'
    role = u.role || 'traveler'
  } catch {
    // User row not created yet (first login before POST /api/users) — defaults.
  }

  try {
    // Internal endpoint exposes the plan; the public /api/tenants/:id does not.
    const t = await $fetch(`/api/internal/tenants/${tenantId}`, { baseURL: userUrl })
    plan = t.plan || 'free'
  } catch {
    // Tenant missing — default plan.
  }

  const value = { tenantId, plan, role }
  if (cache.size >= MAX_ENTRIES) {
    cache.delete(cache.keys().next().value)
  }
  cache.set(uid, { at: Date.now(), value })
  return value
}
