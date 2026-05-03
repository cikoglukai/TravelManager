// GET /api/users/me
// Returns the Postgres profile row for the authenticated user.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const { rows } = await db.query(
    'SELECT firebase_uid, email, name, bio, home_city, avatar_url, created_at FROM users WHERE firebase_uid = $1',
    [ctx.uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  return rows[0]
})
