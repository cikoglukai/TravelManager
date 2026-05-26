// POST /api/trips — create a trip owned by the authenticated user.
// Denormalises author_name from the gateway identity (no users table here) and
// publishes a TripCreated event for the Social feed builder.
import { getDb } from '@travelmanager/shared/db'
import { publishEvent } from '@travelmanager/shared/pubsub'
import { geocodeCity } from '@travelmanager/shared/geocode'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const body = await readBody(event)

  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { title, destination, origin, start_date, short_description, detail_description, dest_lat, dest_lng } = body

  if (!title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (short_description.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Short description must be <= 80 chars' })
  }

  // Always geocode the destination — we need its country for warning matching
  // (warnings are per-country, but users pick a city). Prefer the client's
  // picked coords for the map pin; fall back to the geocoded point.
  const geo = await geocodeCity(destination)
  const lat = Number.isFinite(dest_lat) ? dest_lat : (geo?.lat ?? null)
  const lng = Number.isFinite(dest_lng) ? dest_lng : (geo?.lng ?? null)
  const destCountry = geo?.country ?? null

  const db = getDb()
  const { rows } = await db.query(
    `INSERT INTO trips
     (user_uid, author_name, title, destination, origin, start_date, short_description, detail_description, dest_lat, dest_lng, dest_country)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      user.uid,
      user.name ?? user.email ?? 'Traveller',
      title.trim(),
      destination.trim(),
      origin?.trim() ?? '',
      start_date,
      short_description.trim(),
      detail_description?.trim() ?? '',
      lat,
      lng,
      destCountry,
    ]
  )

  const trip = rows[0]
  await publishEvent('TripCreated', {
    tripId: trip.id,
    userUid: trip.user_uid,
    authorName: trip.author_name,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
  }, { tripId: String(trip.id) }).catch((e) => console.error('[trip-service] publish TripCreated failed', e))

  return trip
})
