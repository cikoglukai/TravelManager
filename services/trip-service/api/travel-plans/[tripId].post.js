// POST /api/travel-plans/:tripId — upsert plan. Modes: "template" (IDs) or
// "custom" (free-form text fields).
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const body = await readBody(event)
  const mode = body.mode === 'custom' ? 'custom' : 'template'

  const db = getDb()

  const { rows: ownerRows } = await db.query(
    'SELECT 1 FROM trips WHERE id = $1 AND user_uid = $2',
    [tripId, user.uid]
  )
  if (!ownerRows.length) throw createError({ statusCode: 403, statusMessage: 'Not your trip' })

  if (mode === 'custom') {
    const {
      custom_destination,
      custom_route_name,
      custom_route_description,
      custom_duration_days,
      custom_highlights,
      custom_transport_type,
      custom_transport_provider,
      custom_transport_duration,
      custom_transport_price_from,
      custom_transport_notes,
      custom_accommodation_type,
      custom_accommodation_name,
      custom_accommodation_price_per_night,
      custom_accommodation_rating,
      custom_accommodation_notes,
      notes,
    } = body

    if (!custom_route_name || !custom_transport_type || !custom_accommodation_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'custom_route_name, custom_transport_type and custom_accommodation_name are required',
      })
    }

    const { rows } = await db.query(
      `INSERT INTO travel_plans
         (trip_id, mode,
          custom_destination, custom_route_name, custom_route_description,
          custom_duration_days, custom_highlights,
          custom_transport_type, custom_transport_provider, custom_transport_duration,
          custom_transport_price_from, custom_transport_notes,
          custom_accommodation_type, custom_accommodation_name,
          custom_accommodation_price_per_night, custom_accommodation_rating, custom_accommodation_notes,
          notes,
          destination_id, route_id, transport_option_id, accommodation_option_id)
       VALUES ($1, 'custom',
               $2, $3, $4, $5, $6,
               $7, $8, $9, $10, $11,
               $12, $13, $14, $15, $16,
               $17,
               NULL, NULL, NULL, NULL)
       ON CONFLICT (trip_id) DO UPDATE SET
         mode                                = 'custom',
         destination_id                      = NULL,
         route_id                            = NULL,
         transport_option_id                 = NULL,
         accommodation_option_id             = NULL,
         custom_destination                  = EXCLUDED.custom_destination,
         custom_route_name                   = EXCLUDED.custom_route_name,
         custom_route_description            = EXCLUDED.custom_route_description,
         custom_duration_days                = EXCLUDED.custom_duration_days,
         custom_highlights                   = EXCLUDED.custom_highlights,
         custom_transport_type               = EXCLUDED.custom_transport_type,
         custom_transport_provider           = EXCLUDED.custom_transport_provider,
         custom_transport_duration           = EXCLUDED.custom_transport_duration,
         custom_transport_price_from         = EXCLUDED.custom_transport_price_from,
         custom_transport_notes              = EXCLUDED.custom_transport_notes,
         custom_accommodation_type           = EXCLUDED.custom_accommodation_type,
         custom_accommodation_name           = EXCLUDED.custom_accommodation_name,
         custom_accommodation_price_per_night= EXCLUDED.custom_accommodation_price_per_night,
         custom_accommodation_rating         = EXCLUDED.custom_accommodation_rating,
         custom_accommodation_notes          = EXCLUDED.custom_accommodation_notes,
         notes                               = EXCLUDED.notes,
         updated_at                          = NOW()
       RETURNING *`,
      [
        tripId,
        custom_destination?.trim() ?? null,
        custom_route_name.trim(),
        custom_route_description?.trim() ?? '',
        custom_duration_days ? Number(custom_duration_days) : null,
        custom_highlights?.trim() ?? '',
        custom_transport_type.trim(),
        custom_transport_provider?.trim() ?? '',
        custom_transport_duration?.trim() ?? '',
        custom_transport_price_from ? Number(custom_transport_price_from) : null,
        custom_transport_notes?.trim() ?? '',
        custom_accommodation_type?.trim() ?? '',
        custom_accommodation_name.trim(),
        custom_accommodation_price_per_night ? Number(custom_accommodation_price_per_night) : null,
        custom_accommodation_rating ? Number(custom_accommodation_rating) : null,
        custom_accommodation_notes?.trim() ?? '',
        notes?.trim() ?? '',
      ]
    )
    return rows[0]
  }

  // Template mode
  const { destination_id, route_id, transport_option_id, accommodation_option_id, notes } = body

  if (!destination_id || !route_id || !transport_option_id || !accommodation_option_id) {
    throw createError({ statusCode: 400, statusMessage: 'destination_id, route_id, transport_option_id and accommodation_option_id are required' })
  }

  const { rows } = await db.query(
    `INSERT INTO travel_plans
       (trip_id, mode, destination_id, route_id, transport_option_id, accommodation_option_id, notes)
     VALUES ($1, 'template', $2, $3, $4, $5, $6)
     ON CONFLICT (trip_id) DO UPDATE SET
       mode                    = 'template',
       destination_id          = EXCLUDED.destination_id,
       route_id                = EXCLUDED.route_id,
       transport_option_id     = EXCLUDED.transport_option_id,
       accommodation_option_id = EXCLUDED.accommodation_option_id,
       notes                   = EXCLUDED.notes,
       custom_destination                   = NULL,
       custom_route_name                    = NULL,
       custom_route_description             = NULL,
       custom_duration_days                 = NULL,
       custom_highlights                    = NULL,
       custom_transport_type                = NULL,
       custom_transport_provider            = NULL,
       custom_transport_duration            = NULL,
       custom_transport_price_from          = NULL,
       custom_transport_notes               = NULL,
       custom_accommodation_type            = NULL,
       custom_accommodation_name            = NULL,
       custom_accommodation_price_per_night = NULL,
       custom_accommodation_rating          = NULL,
       custom_accommodation_notes           = NULL,
       updated_at              = NOW()
     RETURNING id, trip_id, mode, destination_id, route_id, transport_option_id, accommodation_option_id, notes, updated_at`,
    [tripId, destination_id, route_id, transport_option_id, accommodation_option_id, notes?.trim() ?? '']
  )
  return rows[0]
})
