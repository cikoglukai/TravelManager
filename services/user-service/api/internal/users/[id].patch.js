// PATCH /api/internal/users/:id — ops endpoint to set a user's role and/or
// tenant. Internal/gateway-blocked. This is how the destinationMgr role is
// assigned (B2B partner onboarding) and how users are moved between tenants.
// Body: { role?, tenant_id? }.
import { getDb } from '@travelmanager/shared/db'

const ROLES = ['traveler', 'destinationMgr', 'admin']

export default defineEventHandler(async (event) => {
  const uid = getRouterParam(event, 'id')
  const { role, tenant_id } = await readBody(event)
  if (role && !ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: `role must be one of ${ROLES.join(', ')}` })
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE users
     SET role      = COALESCE($1, role),
         tenant_id = COALESCE($2, tenant_id)
     WHERE firebase_uid = $3
     RETURNING firebase_uid, email, name, tenant_id, role`,
    [role ?? null, tenant_id ?? null, uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
