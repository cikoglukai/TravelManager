import { defineEventHandler, getRouterParam, createError } from 'h3'
import { tx } from '../../utils/db.js'
import { emit } from '../../utils/events.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad id' })

  const deleted = await tx(event, async (client) => {
    const { rows } = await client.query(
      `DELETE FROM trips WHERE id = $1 AND user_uid = $2 RETURNING id, user_uid`,
      [id, user.uid]
    )
    return rows[0]
  })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Trip not found' })

  emit('trip.deleted', {
    tripId: deleted.id,
    userUid: deleted.user_uid,
  }, { tenantId: event.context.tenant.tenantId })

  return { ok: true }
})
