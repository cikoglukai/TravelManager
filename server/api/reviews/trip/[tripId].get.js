// GET /api/reviews/trip/:tripId
// Returns all reviews for a trip, joined with reviewer name.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  const db = getDb()

  const { rows } = await db.query(`
    SELECT r.id, r.trip_id, r.reviewer_id, r.stars, r.comment, r.created_at,
           u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    WHERE r.trip_id = $1
    ORDER BY r.created_at DESC
  `, [tripId])

  return rows
})
