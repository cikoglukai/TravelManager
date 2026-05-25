// Shared identity middleware for downstream services.
//
// The API Gateway is the only component that verifies the Firebase JWT. After a
// successful verify it forwards the caller's identity to internal services as
// trusted headers (x-user-uid / x-user-email / x-user-name / x-tenant-id /
// x-plan). Services run on the cluster-internal network and trust these headers;
// they never see the raw token. This keeps Firebase Admin credentials in one
// place (the gateway) and matches the "API Gateway validates JWT" design.
//
// Returns an h3 event handler suitable for a Nitro `middleware/` file.
import { createError } from 'h3'

export function readIdentity(event) {
  const h = event.node?.req?.headers ?? {}
  const uid = h['x-user-uid']
  if (!uid) return null
  return {
    uid: String(uid),
    email: h['x-user-email'] ? String(h['x-user-email']) : '',
    name: h['x-user-name'] ? decodeURIComponent(String(h['x-user-name'])) : '',
    tenantId: h['x-tenant-id'] ? String(h['x-tenant-id']) : 'default',
    plan: h['x-plan'] ? String(h['x-plan']) : 'free',
    role: h['x-role'] ? String(h['x-role']) : 'traveler',
  }
}

// Nitro middleware: populate event.context.user from gateway headers.
// Local dev without a gateway: set DEV_USER_UID to inject a fake identity.
export function identityMiddleware(event) {
  let user = readIdentity(event)

  if (!user && process.env.DEV_USER_UID) {
    user = {
      uid: process.env.DEV_USER_UID,
      email: process.env.DEV_USER_EMAIL || 'dev@example.com',
      name: process.env.DEV_USER_NAME || 'Dev User',
      tenantId: 'default',
      plan: 'enterprise',
      role: process.env.DEV_USER_ROLE || 'destinationMgr',
    }
  }

  if (user) event.context.user = user
}

// Guard helper for handlers that require an authenticated caller.
export function requireUser(event) {
  const user = event.context.user
  if (!user?.uid) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}
