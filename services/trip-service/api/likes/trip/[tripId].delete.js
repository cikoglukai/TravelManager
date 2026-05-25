// DELETE /api/likes/trip/:tripId — remove like (auth required).
import { getFirestoreDb } from '@travelmanager/shared/firebase'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = getRouterParam(event, 'tripId')
  await getFirestoreDb().collection('likes').doc(tripId).collection('users').doc(ctx.uid).delete()

  return { success: true }
})
