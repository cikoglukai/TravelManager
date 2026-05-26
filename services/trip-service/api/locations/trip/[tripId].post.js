// POST /api/locations/trip/:tripId — add a location (owner only).
import { getDb } from '@travelmanager/shared/db'
import { geocodeCity } from '@travelmanager/shared/geocode'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const { name, description, image_url, latitude, longitude, category, date_from, date_to } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  }
  if (name.trim().length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be 120 characters or fewer' })
  }

  const db = getDb()

  const { rows: ownerRows } = await db.query(
    'SELECT 1 FROM trips WHERE id = $1 AND user_uid = $2',
    [tripId, user.uid]
  )
  if (!ownerRows.length) throw createError({ statusCode: 403, statusMessage: 'Not your trip' })

  const { rows: [{ max }] } = await db.query(
    'SELECT COALESCE(MAX(position), -1) AS max FROM plan_locations WHERE trip_id = $1',
    [tripId]
  )

  // Prefer coords the client captured from the Places autocomplete (a real
  // picked place); else best-effort geocode the typed name.
  let lat = Number.isFinite(latitude) ? latitude : null
  let lng = Number.isFinite(longitude) ? longitude : null
  if (lat == null || lng == null) {
    const geo = await geocodeCity(name)
    lat = geo?.lat ?? null
    lng = geo?.lng ?? null
  }

  const { rows } = await db.query(
    `INSERT INTO plan_locations (trip_id, name, description, image_url, latitude, longitude, category, date_from, date_to, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, trip_id, name, description, image_url, latitude, longitude, category, date_from, date_to, position, created_at`,
    [tripId, name.trim(), description?.trim() ?? '', image_url?.trim() ?? '', lat, lng, category || 'other', date_from ?? null, date_to ?? null, Number(max) + 1]
  )
  return rows[0]
})
