// GET /api/trips — returns the authenticated user's trips
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const { rows } = await db.query(
    `SELECT id, title, destination, start_date, short_description
     FROM trips
     WHERE user_uid = $1
     ORDER BY start_date DESC`,
    [user.uid]
  )
  return rows
})
