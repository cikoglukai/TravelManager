// GET /api/travel-plans/:tripId
// Returns the travel plan for a given trip, or 404 if none exists yet.
// Joined template fields are NULL for custom plans, and custom_* fields are
// NULL for template plans — the client switches on `mode`.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const db = getDb()
  const { rows } = await db.query(
    `SELECT
       tp.id, tp.trip_id, tp.mode, tp.notes, tp.created_at, tp.updated_at,
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
       ac.notes      AS accommodation_notes,
       tp.custom_destination,
       tp.custom_route_name,
       tp.custom_route_description,
       tp.custom_duration_days,
       tp.custom_highlights,
       tp.custom_transport_type,
       tp.custom_transport_provider,
       tp.custom_transport_duration,
       tp.custom_transport_price_from,
       tp.custom_transport_notes,
       tp.custom_accommodation_type,
       tp.custom_accommodation_name,
       tp.custom_accommodation_price_per_night,
       tp.custom_accommodation_rating,
       tp.custom_accommodation_notes
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
