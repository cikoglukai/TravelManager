// POST /api/travel-plans/:tripId
// Creates or updates (upserts) the travel plan for a trip.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const { destination_id, route_id, transport_option_id, accommodation_option_id, notes } = await readBody(event)

  if (!destination_id || !route_id || !transport_option_id || !accommodation_option_id) {
    throw createError({ statusCode: 400, statusMessage: 'destination_id, route_id, transport_option_id and accommodation_option_id are required' })
  }

  const db = getDb()

  const { rows: ownerRows } = await db.query(
    'SELECT 1 FROM trips WHERE id = $1 AND user_uid = $2',
    [tripId, user.uid]
  )
  if (!ownerRows.length) throw createError({ statusCode: 403, statusMessage: 'Not your trip' })

  const { rows } = await db.query(
    `INSERT INTO travel_plans
       (trip_id, destination_id, route_id, transport_option_id, accommodation_option_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (trip_id) DO UPDATE SET
       destination_id          = EXCLUDED.destination_id,
       route_id                = EXCLUDED.route_id,
       transport_option_id     = EXCLUDED.transport_option_id,
       accommodation_option_id = EXCLUDED.accommodation_option_id,
       notes                   = EXCLUDED.notes,
       updated_at              = NOW()
     RETURNING id, trip_id, destination_id, route_id, transport_option_id, accommodation_option_id, notes, updated_at`,
    [tripId, destination_id, route_id, transport_option_id, accommodation_option_id, notes?.trim() ?? '']
  )
  return rows[0]
})
