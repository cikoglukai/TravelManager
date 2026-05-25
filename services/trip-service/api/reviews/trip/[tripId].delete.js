// DELETE /api/reviews/trip/:tripId — drop caller's review (Postgres + Firestore).
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = Number(getRouterParam(event, 'tripId'))
  const db = getDb()

  const { rowCount } = await db.query(
    'DELETE FROM reviews WHERE trip_id = $1 AND reviewer_id = $2',
    [tripId, user.uid]
  )
  if (!rowCount) throw createError({ statusCode: 404, statusMessage: 'Review not found' })

  const fs = getFirestoreDb()
  await fs.collection('reviews').doc(String(tripId)).collection('users').doc(user.uid).delete().catch(() => {})

  return { ok: true }
})
