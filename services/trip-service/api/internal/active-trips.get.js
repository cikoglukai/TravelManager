// GET /api/internal/active-trips — internal feed for the Travel Info diff
// engine. Returns upcoming trips with destination so warnings/weather can be
// matched against them. Not exposed through the public gateway.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async () => {
  const db = getDb()
  const { rows } = await db.query(
    `SELECT id AS trip_id, user_uid, title, destination, dest_country, start_date
     FROM trips
     WHERE start_date >= CURRENT_DATE::text
     ORDER BY start_date ASC
     LIMIT 5000`
  )
  return rows
})
