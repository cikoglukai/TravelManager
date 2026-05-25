// GET /api/internal/destination-stats?city=&country=
// Internal endpoint for the Destination service's B2B aggregation. Returns only
// aggregated, anonymized counts grouped by origin — never per-user rows.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const { city, country } = getQuery(event)
  const term = `%${String(city || country || '').trim()}%`
  const db = getDb()

  const { rows: [counts] } = await db.query(
    `SELECT
       COUNT(*)::int                                              AS trip_count,
       COUNT(*) FILTER (WHERE start_date >= CURRENT_DATE::text)::int AS upcoming_count
     FROM trips
     WHERE destination ILIKE $1`,
    [term]
  )

  const { rows: origins } = await db.query(
    `SELECT origin, COUNT(*)::int AS travelers
     FROM trips
     WHERE destination ILIKE $1 AND origin <> ''
     GROUP BY origin
     HAVING COUNT(*) >= 1
     ORDER BY travelers DESC
     LIMIT 10`,
    [term]
  )

  return {
    tripCount: counts?.trip_count ?? 0,
    upcomingCount: counts?.upcoming_count ?? 0,
    topOrigins: origins.map(o => ({ origin: o.origin, travelers: o.travelers })),
  }
})
