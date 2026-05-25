// DELETE /api/trips/:id — owner-only. Clears the trip's Firestore likes/reviews
// so a future trip reusing the SERIAL id cannot inherit stale comments.
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { getDb } from '@travelmanager/shared/db'

async function clearTripSubcollection(fs, collection, tripId) {
  const userDocs = await fs.collection(collection).doc(String(tripId)).collection('users').listDocuments()
  if (!userDocs.length) return
  const batch = fs.batch()
  userDocs.forEach(d => batch.delete(d))
  await batch.commit()
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  const db = getDb()
  const { rowCount } = await db.query(
    'DELETE FROM trips WHERE id = $1 AND user_uid = $2',
    [id, user.uid]
  )
  if (!rowCount) throw createError({ statusCode: 404 })

  try {
    const fs = getFirestoreDb()
    await Promise.all([
      clearTripSubcollection(fs, 'likes', id),
      clearTripSubcollection(fs, 'reviews', id),
    ])
  } catch (e) {
    console.error('[trips.delete] firestore cleanup failed:', e)
  }

  return { success: true }
})
