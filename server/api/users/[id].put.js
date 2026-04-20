// PUT /api/users/:id
// Updates the traveller's editable profile fields: name, bio, home_city.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })

  const { name, bio, home_city } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }
  if (name.trim().length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be 100 characters or fewer' })
  }
  if (bio && bio.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Bio must be 500 characters or fewer' })
  }
  if (home_city && home_city.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Home city must be 100 characters or fewer' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE users
     SET name = $1, bio = $2, home_city = $3
     WHERE id = $4
     RETURNING id, name, email, bio, home_city, avatar_url, created_at`,
    [name.trim(), bio?.trim() ?? '', home_city?.trim() ?? '', id]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
