// GET /api/locations/trip/:tripId
// Returns all locations for a trip, ordered by position then creation time.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const db = getDb()
  const { rows } = await db.query(
    `SELECT id, trip_id, name, description, image_url, date_from, date_to, position, created_at
     FROM plan_locations
     WHERE trip_id = $1
     ORDER BY position ASC, created_at ASC`,
    [tripId]
  )
  return rows
})
