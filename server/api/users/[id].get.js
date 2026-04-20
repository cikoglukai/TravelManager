// GET /api/users/:id
// Returns the full profile for a single traveller.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })

  const db = getDb()
  const { rows } = await db.query(
    'SELECT id, name, email, bio, home_city, avatar_url, created_at FROM users WHERE id = $1',
    [id]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
