// PUT /api/trips/:id — owner-only update. Publishes TripUpdated.
import { getDb } from '@travelmanager/shared/db'
import { publishEvent } from '@travelmanager/shared/pubsub'
import { geocodeCity } from '@travelmanager/shared/geocode'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const { title, destination, origin, start_date, short_description, detail_description, dest_lat, dest_lng } = body

  if (!title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({ statusCode: 400 })
  }
  if (short_description.length > 80) throw createError({ statusCode: 400 })

  // Always geocode for the country (warning matching); prefer client coords
  // for the pin.
  const geo = await geocodeCity(destination)
  const lat = Number.isFinite(dest_lat) ? dest_lat : (geo?.lat ?? null)
  const lng = Number.isFinite(dest_lng) ? dest_lng : (geo?.lng ?? null)
  const destCountry = geo?.country ?? null

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE trips
     SET title=$1, destination=$2, origin=$3, start_date=$4,
         short_description=$5, detail_description=$6, dest_lat=$7, dest_lng=$8, dest_country=$9
     WHERE id=$10 AND user_uid=$11
     RETURNING *`,
    [
      title.trim(),
      destination.trim(),
      origin?.trim() ?? '',
      start_date,
      short_description.trim(),
      detail_description?.trim() ?? '',
      lat,
      lng,
      destCountry,
      id,
      user.uid,
    ]
  )
  if (!rows.length) throw createError({ statusCode: 404 })

  const trip = rows[0]
  await publishEvent('TripUpdated', {
    tripId: trip.id,
    userUid: trip.user_uid,
    authorName: trip.author_name,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
  }, { tripId: String(trip.id) }).catch((e) => console.error('[trip-service] publish TripUpdated failed', e))

  return trip
})
