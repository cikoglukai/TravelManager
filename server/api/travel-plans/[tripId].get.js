// GET /api/travel-plans/:tripId
// Returns the travel plan for a given trip, or 404 if none exists yet.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const db = getDb()
  const { rows } = await db.query(
    `SELECT
       tp.id, tp.trip_id, tp.notes, tp.created_at, tp.updated_at,
       d.id          AS destination_id,
       d.country, d.city, d.emoji,
       d.description AS destination_description,
       r.id          AS route_id,
       r.name        AS route_name,
       r.description AS route_description,
       r.duration_days, r.highlights,
       tr.id         AS transport_id,
       tr.type       AS transport_type,
       tr.provider,
       tr.duration   AS transport_duration,
       tr.price_from,
       tr.notes      AS transport_notes,
       ac.id         AS accommodation_id,
       ac.type       AS accommodation_type,
       ac.name       AS accommodation_name,
       ac.price_per_night,
       ac.rating,
       ac.notes      AS accommodation_notes
     FROM travel_plans tp
     LEFT JOIN destinations          d  ON d.id  = tp.destination_id
     LEFT JOIN routes                r  ON r.id  = tp.route_id
     LEFT JOIN transport_options     tr ON tr.id = tp.transport_option_id
     LEFT JOIN accommodation_options ac ON ac.id = tp.accommodation_option_id
     WHERE tp.trip_id = $1`,
    [tripId]
  )

  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'No travel plan found' })
  return rows[0]
})
