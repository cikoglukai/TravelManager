// POST /api/locations/trip/:tripId
// Creates a new location for a trip.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const { name, description, image_url } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  }
  if (name.trim().length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be 120 characters or fewer' })
  }

  const db = getDb()

  // Assign next position
  const { rows: [{ max }] } = await db.query(
    'SELECT COALESCE(MAX(position), -1) AS max FROM plan_locations WHERE trip_id = $1',
    [tripId]
  )

  const { rows } = await db.query(
    `INSERT INTO plan_locations (trip_id, name, description, image_url, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, trip_id, name, description, image_url, position, created_at`,
    [tripId, name.trim(), description?.trim() ?? '', image_url?.trim() ?? '', Number(max) + 1]
  )
  return rows[0]
})
