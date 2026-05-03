// GET /api/trips/all — public, no auth required
// Returns all trips from all users including the author's name.
// Supports ?q= for full-text search on title, destination, short_description.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const { q } = getQuery(event)

  if (q && String(q).trim()) {
    const search = `%${String(q).trim()}%`
    const { rows } = await db.query(
      `SELECT t.id, t.title, t.destination, t.start_date, t.short_description,
              t.user_uid, u.name AS author_name
       FROM trips t
       JOIN users u ON u.firebase_uid = t.user_uid
       WHERE t.title ILIKE $1
          OR t.destination ILIKE $1
          OR t.short_description ILIKE $1
       ORDER BY t.start_date DESC`,
      [search]
    )
    return rows
  }

  const { rows } = await db.query(
    `SELECT t.id, t.title, t.destination, t.start_date, t.short_description,
            t.user_uid, u.name AS author_name
     FROM trips t
     JOIN users u ON u.firebase_uid = t.user_uid
     ORDER BY t.start_date DESC`
  )
  return rows
})
