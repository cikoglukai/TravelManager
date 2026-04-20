// PATCH /api/users/:id
// Updates only the user's avatar_url (base64 data URL or empty string to remove).
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })

  const { avatar_url } = await readBody(event)

  // Accept a base64 data URL or an empty string (to remove avatar)
  if (avatar_url === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'avatar_url is required' })
  }

  // Rough size guard — base64 of a compressed image shouldn't exceed ~600 KB
  if (avatar_url.length > 800_000) {
    throw createError({ statusCode: 413, statusMessage: 'Image is too large. Please use a smaller photo.' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE users
     SET avatar_url = $1
     WHERE id = $2
     RETURNING id, name, email, bio, home_city, avatar_url, created_at`,
    [avatar_url, id]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
