// GET /api/reviews/trip/:tripId
// Stars + reviewer_name from Postgres; comment text from Firestore.
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  const db = getDb()

  const { rows } = await db.query(`
    SELECT r.id, r.trip_id, r.reviewer_id, r.stars, r.created_at,
           u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON u.firebase_uid = r.reviewer_id
    WHERE r.trip_id = $1
    ORDER BY r.created_at DESC
  `, [tripId])

  if (!rows.length) return []

  const fs = getFirestore(getApp(), 'onecloudaway-db')
  const snap = await fs.collection('reviews').doc(String(tripId)).collection('users').get()
  const commentByUid = new Map()
  snap.forEach(doc => {
    const d = doc.data()
    if (d.comment) commentByUid.set(doc.id, d.comment)
  })
  console.log('[reviews.get] tripId=%s sqlRows=%d firestoreDocs=%d', tripId, rows.length, snap.size)

  return rows.map(r => ({ ...r, comment: commentByUid.get(r.reviewer_id) ?? '' }))
})
