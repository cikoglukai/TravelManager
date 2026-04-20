// GET /api/trips/all
// Returns all trips from all users, including the author's name.
// Used by the community/discovery page.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async () => {
  const db = getDb()
  const { rows } = await db.query(
    `SELECT t.id, t.title, t.destination, t.start_date, t.short_description,
            t.user_id, u.name AS author_name
     FROM trips t
     JOIN users u ON u.id = t.user_id
     ORDER BY t.start_date DESC`
  )
  return rows
})
