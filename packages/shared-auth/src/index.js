// @travelmanager/shared-auth
// Firebase JWT verification + multi-tenant + plan-gate middleware shared across all services.

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export const PUBLIC_PATTERNS = [
  /^\/api\/trips\/all$/,
  /^\/api\/destinations(\/|$)/,
  /^\/api\/likes\/trip\/[^/]+$/,        // GET only, gated below
  /^\/api\/health$/,
  /^\/api\/internal\/pubsub\/[^/]+$/,    // Pub/Sub push, gated by OIDC token verification
]

const PLAN_RANK = { free: 0, standard: 1, enterprise: 2 }

let _authClient = null

export function initFirebaseAdmin() {
  if (_authClient) return _authClient

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  const isProd = process.env.NODE_ENV === 'production'

  try {
    const app =
      getApps().length > 0
        ? getApps()[0]
        : serviceAccountJson && serviceAccountJson !== '{}'
          ? initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
          : initializeApp({
              credential: applicationDefault(),
              projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
            })
    _authClient = getAuth(app)
  } catch (e) {
    const msg = `[shared-auth] Firebase Admin init failed: ${e}`
    if (isProd) throw new Error(msg)
    console.warn(msg)
  }
  return _authClient
}

export function isPublicRoute(path, method) {
  if (/^\/api\/likes\/trip\/[^/]+$/.test(path) && method !== 'GET') return false
  return PUBLIC_PATTERNS.some((p) => p.test(path))
}

// Resolve tenantId + plan from Host header subdomain.
//   acme.travelmanager.app  -> { tenantId: 'acme',    plan: from-DB-or-cache }
//   travelmanager.app       -> { tenantId: 'public',  plan: 'free' }
//   localhost / *.dev       -> { tenantId: 'dev',     plan: 'enterprise' } (dev convenience)
export function resolveTenantFromHost(host, tenantPlanLookup) {
  if (!host) return { tenantId: 'public', plan: 'free' }
  const h = host.toLowerCase().split(':')[0]
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.dev')) {
    return { tenantId: 'dev', plan: 'enterprise' }
  }
  const parts = h.split('.')
  if (parts.length < 3) return { tenantId: 'public', plan: 'free' }
  const tenantId = parts[0]
  const plan = (tenantPlanLookup && tenantPlanLookup(tenantId)) || 'free'
  return { tenantId, plan }
}

// Nitro/h3 middleware factory — call with options to wire into a service.
//   import { defineEventHandler, createError } from 'h3'
//   import { authMiddleware } from '@travelmanager/shared-auth'
//   export default defineEventHandler(authMiddleware({ tenantPlanLookup }))
export function authMiddleware({ tenantPlanLookup, defineEventHandler, createError } = {}) {
  const skipAuth = process.env.NODE_ENV !== 'production' && process.env.SKIP_AUTH === '1'
  const authClient = initFirebaseAdmin()

  return async (event) => {
    const rawPath = event.path ?? ''
    const path = rawPath.split('?')[0]

    // Pages and non-/api routes pass through (relevant only for bff-gateway).
    if (!path.startsWith('/api/')) return

    // Resolve tenant on every request — needed by handlers regardless of auth.
    const host = event.node?.req?.headers?.host
    event.context.tenant = resolveTenantFromHost(host, tenantPlanLookup)

    if (isPublicRoute(path, event.method)) return
    if (skipAuth) return
    if (!authClient) return

    const authHeader = event.node?.req?.headers?.['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Missing token' })
    }
    const token = authHeader.slice(7)
    try {
      const decoded = await authClient.verifyIdToken(token)
      event.context.user = decoded
    } catch {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }
  }
}

// Plan-gate higher-order handler. Wrap any endpoint that needs >= a given plan.
//   export default requirePlan('standard', defineEventHandler(async (event) => { ... }))
export function requirePlan(minPlan, handler, { createError } = {}) {
  const min = PLAN_RANK[minPlan]
  if (min === undefined) throw new Error(`Unknown plan: ${minPlan}`)
  return async (event) => {
    const tenantPlan = event.context.tenant?.plan ?? 'free'
    const have = PLAN_RANK[tenantPlan] ?? 0
    if (have < min) {
      throw createError({
        statusCode: 403,
        statusMessage: `Plan '${minPlan}' or higher required (tenant on '${tenantPlan}')`,
      })
    }
    return handler(event)
  }
}

// Verify a Pub/Sub push request — checks Google-signed OIDC token in Authorization header.
// Returns the decoded payload (or throws 401). The audience is the configured PUBSUB_PUSH_AUDIENCE
// (typically the service URL).
export async function verifyPubsubPushToken(event, { createError } = {}) {
  const authHeader = event.node?.req?.headers?.['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing OIDC token' })
  }
  const token = authHeader.slice(7)
  const expectedAudience = process.env.PUBSUB_PUSH_AUDIENCE
  const expectedSa = process.env.PUBSUB_PUSH_SERVICE_ACCOUNT  // optional principal pinning

  // Lazy import — google-auth-library is heavy; only services consuming Pub/Sub need it.
  const { OAuth2Client } = await import('google-auth-library')
  const client = new OAuth2Client()
  const ticket = await client.verifyIdToken({ idToken: token, audience: expectedAudience })
  const payload = ticket.getPayload()
  if (expectedSa && payload.email !== expectedSa) {
    throw createError({ statusCode: 401, statusMessage: 'Bad push principal' })
  }
  return payload
}
