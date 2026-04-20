// POST /api/reviews/trip/:tripId
// Creates or updates (upserts) a review. One review per user per trip.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  const { reviewer_id, stars, comment } = await readBody(event)

  if (!reviewer_id) throw createError({ statusCode: 400, statusMessage: 'reviewer_id required' })
  if (!stars || stars < 1 || stars > 5) throw createError({ statusCode: 400, statusMessage: 'stars must be 1–5' })

  const db = getDb()

  // Prevent reviewing own trip
  const { rows: tripRows } = await db.query('SELECT user_id FROM trips WHERE id = $1', [tripId])
  if (!tripRows.length) throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  if (tripRows[0].user_id === reviewer_id) throw createError({ statusCode: 403, statusMessage: 'Cannot review your own trip' })

  const { rows } = await db.query(`
    INSERT INTO reviews (trip_id, reviewer_id, stars, comment)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (trip_id, reviewer_id) DO UPDATE
      SET stars = EXCLUDED.stars,
          comment = EXCLUDED.comment,
          updated_at = NOW()
    RETURNING *
  `, [tripId, reviewer_id, stars, comment ?? ''])

  return rows[0]
})
