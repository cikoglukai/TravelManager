// GET /api/internal/trips-by-authors?uids=a,b,c — trips authored by the given
// users, newest first. Internal feed source for the Social service (query-time
// feed); not routed through the public gateway.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const { uids } = getQuery(event)
  const list = String(uids || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!list.length) return []

  const db = getDb()
  const { rows } = await db.query(
    `SELECT id AS trip_id, user_uid AS author_uid, author_name, title,
            destination, dest_country, start_date,
            COALESCE(like_count, 0) AS like_count, created_at
     FROM trips
     WHERE user_uid = ANY($1)
     ORDER BY created_at DESC
     LIMIT 200`,
    [list]
  )
  return rows
})
