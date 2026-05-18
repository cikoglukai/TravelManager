import { defineEventHandler, readBody, createError } from 'h3'
import { tx } from '../../utils/db.js'
import { emit } from '../../utils/events.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { title, destination, origin, start_date, end_date, short_description, detail_description } = body

  if (!title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (short_description.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Short description must be <= 80 chars' })
  }

  const trip = await tx(event, async (client) => {
    await client.query(
      `INSERT INTO users (firebase_uid, email, name)
       VALUES ($1,$2,$3)
       ON CONFLICT (firebase_uid) DO NOTHING`,
      [user.uid, user.email ?? '', user.name ?? user.email ?? 'Traveller']
    )
    const { rows } = await client.query(
      `INSERT INTO trips (user_uid, title, destination, origin, start_date, end_date, short_description, detail_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        user.uid,
        title.trim(),
        destination.trim(),
        origin?.trim() ?? '',
        start_date,
        end_date ?? null,
        short_description.trim(),
        detail_description?.trim() ?? '',
      ]
    )
    return rows[0]
  })

  emit('trip.created', {
    tripId: trip.id,
    userUid: trip.user_uid,
    destination: trip.destination,
    origin: trip.origin,
    startDate: trip.start_date,
    endDate: trip.end_date ?? trip.start_date,
  }, { tenantId: event.context.tenant.tenantId })

  return trip
})
