// PUT /api/locations/:id — update name/description/image/dates (owner only).
import { getDb } from '@travelmanager/shared/db'
import { geocodeCity } from '@travelmanager/shared/geocode'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid location ID' })

  const { name, description, image_url, latitude, longitude, category, date_from, date_to } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  }

  // Prefer client-picked coords (Places autocomplete); else re-geocode the name.
  let lat = Number.isFinite(latitude) ? latitude : null
  let lng = Number.isFinite(longitude) ? longitude : null
  if (lat == null || lng == null) {
    const geo = await geocodeCity(name)
    lat = geo?.lat ?? null
    lng = geo?.lng ?? null
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE plan_locations
     SET name = $1, description = $2, image_url = $3, latitude = $4, longitude = $5, category = $6, date_from = $7, date_to = $8
     WHERE id = $9
       AND trip_id IN (SELECT id FROM trips WHERE user_uid = $10)
     RETURNING id, trip_id, name, description, image_url, latitude, longitude, category, date_from, date_to, position, created_at`,
    [name.trim(), description?.trim() ?? '', image_url?.trim() ?? '', lat, lng, category || 'other', date_from ?? null, date_to ?? null, id, user.uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
  return rows[0]
})
