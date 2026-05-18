import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { tx } from '../../../utils/db.js'
import { emit } from '../../../utils/events.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = Number(getRouterParam(event, 'tripId'))
  const { name, description, image_url, date_from, date_to, position } = await readBody(event)
  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name required' })

  const loc = await tx(event, async (client) => {
    const owner = await client.query(`SELECT user_uid FROM trips WHERE id = $1`, [tripId])
    if (owner.rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
    if (owner.rows[0].user_uid !== user.uid) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const { rows } = await client.query(
      `INSERT INTO plan_locations (trip_id, name, description, image_url, date_from, date_to, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [tripId, name.trim(), description ?? '', image_url ?? '', date_from ?? null, date_to ?? null, position ?? 0]
    )
    return rows[0]
  })

  emit('trip.updated', {
    tripId,
    userUid: user.uid,
    changedFields: ['locations'],
  }, { tenantId: event.context.tenant.tenantId })

  return loc
})
