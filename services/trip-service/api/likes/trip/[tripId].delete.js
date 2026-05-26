// DELETE /api/likes/trip/:tripId — remove like (auth required).
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = getRouterParam(event, 'tripId')
  const ref = getFirestoreDb().collection('likes').doc(tripId).collection('users').doc(ctx.uid)
  const existing = await ref.get()
  await ref.delete()

  // Decrement the denormalised tally only if a like actually existed.
  if (existing.exists) {
    await getDb().query(
      'UPDATE trips SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
      [Number(tripId)]
    ).catch((e) => console.error('[likes.delete] like_count drop failed', e?.message || e))
  }

  return { success: true }
})
