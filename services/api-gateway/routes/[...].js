// Gateway catch-all. Pipeline: route → block internal → public passthrough →
// verify JWT → resolve tenant/plan → rate limit → feature gate → proxy with
// injected identity headers.
import { getAuthClient } from '@travelmanager/shared/firebase'
import { getPlan } from '@travelmanager/shared/tiers'
import { resolveService, serviceUrl, isPublic, isBlocked, featureGate } from '../utils/routing.js'
import { resolveTenantPlan } from '../utils/resolve.js'
import { allow } from '../utils/ratelimit.js'
import { proxyTo } from '../utils/proxy.js'

const skipAuth = process.env.GATEWAY_SKIP_AUTH === '1'

export default defineEventHandler(async (event) => {
  const path = (event.path || '').split('?')[0]

  if (!path.startsWith('/api/')) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  if (isBlocked(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const serviceKey = resolveService(path)
  if (!serviceKey) throw createError({ statusCode: 404, statusMessage: 'No route' })

  const target = serviceUrl(serviceKey)
  if (!target) throw createError({ statusCode: 502, statusMessage: 'Service unavailable' })

  // Public routes: proxy straight through (no identity headers).
  if (isPublic(path, event.method)) {
    return proxyTo(event, target + event.path)
  }

  // Authenticate.
  let identity
  if (skipAuth) {
    const dbgUid = event.node.req.headers['x-debug-uid']
    if (!dbgUid) throw createError({ statusCode: 401, statusMessage: 'Missing x-debug-uid (skip-auth mode)' })
    identity = { uid: String(dbgUid), email: 'dev@example.com', name: 'Dev User' }
  } else {
    const authHeader = event.node.req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Missing token' })
    }
    try {
      const decoded = await getAuthClient().verifyIdToken(authHeader.slice(7))
      identity = { uid: decoded.uid, email: decoded.email ?? '', name: decoded.name ?? '' }
    } catch {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }
  }

  // Resolve tenant + plan + role.
  const { tenantId, plan, role } = await resolveTenantPlan(identity.uid)

  // Rate limit per caller (uid) at the plan's rate, so users never share a bucket.
  if (!allow(identity.uid, getPlan(plan).rateLimitPerMin)) {
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded for your plan' })
  }

  // Feature gating.
  const denied = featureGate(path, plan)
  if (denied) throw createError({ statusCode: 403, statusMessage: denied })

  // Proxy with trusted identity headers.
  return proxyTo(event, target + event.path, {
    'x-user-uid': identity.uid,
    'x-user-email': identity.email,
    'x-user-name': encodeURIComponent(identity.name || ''),
    'x-tenant-id': tenantId,
    'x-plan': plan,
    'x-role': role,
  })
})
