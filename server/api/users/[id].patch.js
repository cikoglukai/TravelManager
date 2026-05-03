// PATCH /api/users/:id
// Updates avatar_url only. Only the authenticated user can patch their own record.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const uid = getRouterParam(event, 'id')
  const ctx = event.context.user

  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (uid !== ctx.uid) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { avatar_url } = await readBody(event)

  if (avatar_url === undefined) throw createError({ statusCode: 400, statusMessage: 'avatar_url is required' })
  if (avatar_url && !avatar_url.startsWith('https://')) {
    throw createError({ statusCode: 400, statusMessage: 'avatar_url must be an HTTPS URL' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE users
     SET avatar_url = $1
     WHERE firebase_uid = $2
     RETURNING firebase_uid, email, name, bio, home_city, avatar_url, created_at`,
    [avatar_url, uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return rows[0]
})
