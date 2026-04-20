// GET /api/destinations
// Returns all 15 pre-seeded European destinations.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async () => {
  const db = getDb()
  const { rows } = await db.query(
    'SELECT id, country, city, emoji, description FROM destinations ORDER BY country ASC'
  )
  return rows
})
