// GET /api/destinations — all pre-seeded European destinations.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async () => {
  const db = getDb()
  const { rows } = await db.query(
    'SELECT id, country, city, emoji, description FROM destinations ORDER BY country ASC'
  )
  return rows
})
