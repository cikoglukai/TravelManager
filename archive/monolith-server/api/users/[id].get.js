// GET /api/users/:id
// Public profile read. :id is the firebase_uid (TEXT).
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const uid = getRouterParam(event, 'id')
  if (!uid) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })

  const db = getDb()
  const { rows } = await db.query(
    'SELECT firebase_uid, email, name, bio, home_city, avatar_url, created_at FROM users WHERE firebase_uid = $1',
    [uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
