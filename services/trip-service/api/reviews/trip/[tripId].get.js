// GET /api/reviews/trip/:tripId — stars + denormalised reviewer_name from
// Postgres; comment text from Firestore.
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  const db = getDb()

  const { rows } = await db.query(`
    SELECT id, trip_id, reviewer_id, reviewer_name, stars, created_at
    FROM reviews
    WHERE trip_id = $1
    ORDER BY created_at DESC
  `, [tripId])

  if (!rows.length) return []

  const fs = getFirestoreDb()
  const snap = await fs.collection('reviews').doc(String(tripId)).collection('users').get()
  const commentByUid = new Map()
  snap.forEach(doc => {
    const d = doc.data()
    if (d.comment) commentByUid.set(doc.id, d.comment)
  })

  return rows.map(r => ({ ...r, comment: commentByUid.get(r.reviewer_id) ?? '' }))
})
