// GET /api/users/me — Postgres profile row for the authenticated user.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const { rows } = await db.query(
    'SELECT firebase_uid, email, name, bio, home_city, avatar_url, tenant_id, role, created_at FROM users WHERE firebase_uid = $1',
    [ctx.uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  return rows[0]
})
