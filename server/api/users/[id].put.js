// PUT /api/users/:id
// Updates editable profile fields: name, bio, home_city.
// Only the authenticated user can update their own profile.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const uid = getRouterParam(event, 'id')
  const ctx = event.context.user

  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (uid !== ctx.uid) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { name, bio, home_city } = await readBody(event)

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  if (name.trim().length > 100) throw createError({ statusCode: 400, statusMessage: 'Name must be 100 characters or fewer' })
  if (bio && bio.length > 500) throw createError({ statusCode: 400, statusMessage: 'Bio must be 500 characters or fewer' })
  if (home_city && home_city.length > 100) throw createError({ statusCode: 400, statusMessage: 'Home city must be 100 characters or fewer' })

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE users
     SET name = $1, bio = $2, home_city = $3
     WHERE firebase_uid = $4
     RETURNING firebase_uid, email, name, bio, home_city, avatar_url, created_at`,
    [name.trim(), bio?.trim() ?? '', home_city?.trim() ?? '', uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
