// GET /api/alerts — active travel alerts for the authenticated user's trips.
// Powers the SPA alert banner. Joined weather hint included when available.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const { rows } = await db.query(
    `SELECT trip_id, kind, country, severity, title, created_at
     FROM alert_log
     WHERE user_uid = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [user.uid]
  )
  return rows
})
