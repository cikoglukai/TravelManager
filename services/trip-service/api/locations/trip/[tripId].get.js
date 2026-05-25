// GET /api/locations/trip/:tripId — locations for a trip, ordered.
import { getDb } from '@travelmanager/shared/db'

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
