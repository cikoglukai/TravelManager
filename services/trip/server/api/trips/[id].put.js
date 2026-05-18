import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { tx } from '../../utils/db.js'
import { emit } from '../../utils/events.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad id' })

  const body = await readBody(event)
  const fields = ['title', 'destination', 'origin', 'start_date', 'end_date', 'short_description', 'detail_description']
  const changedFields = []
  const sets = []
  const values = []
  for (const f of fields) {
    if (body[f] !== undefined) {
      values.push(body[f])
      sets.push(`${f} = $${values.length}`)
      changedFields.push(f)
    }
  }
  if (sets.length === 0) throw createError({ statusCode: 400, statusMessage: 'No fields to update' })

  values.push(id, user.uid)
  const trip = await tx(event, async (client) => {
    const { rows } = await client.query(
      `UPDATE trips SET ${sets.join(', ')}
       WHERE id = $${values.length - 1} AND user_uid = $${values.length}
       RETURNING *`,
      values
    )
    if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
    return rows[0]
  })

  emit('trip.updated', {
    tripId: trip.id,
    userUid: trip.user_uid,
    destination: trip.destination,
    origin: trip.origin,
    startDate: trip.start_date,
    endDate: trip.end_date ?? trip.start_date,
    changedFields,
  }, { tenantId: event.context.tenant.tenantId })

  return trip
})
