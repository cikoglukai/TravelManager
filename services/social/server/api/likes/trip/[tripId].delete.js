import { defineEventHandler, getRouterParam, createError } from 'h3'
import { fs } from '../../../utils/firestore.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const tripId = getRouterParam(event, 'tripId')
  await fs().collection('likes').doc(tripId).collection('users').doc(user.uid).delete()
  return { ok: true }
})
