// PUT /api/trips/:id — owner-only update. Publishes TripUpdated.
import { getDb } from '@travelmanager/shared/db'
import { publishEvent } from '@travelmanager/shared/pubsub'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const { title, destination, origin, start_date, short_description, detail_description } = body

  if (!title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({ statusCode: 400 })
  }
  if (short_description.length > 80) throw createError({ statusCode: 400 })

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE trips
     SET title=$1, destination=$2, origin=$3, start_date=$4,
         short_description=$5, detail_description=$6
     WHERE id=$7 AND user_uid=$8
     RETURNING *`,
    [
      title.trim(),
      destination.trim(),
      origin?.trim() ?? '',
      start_date,
      short_description.trim(),
      detail_description?.trim() ?? '',
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
