// POST /api/reviews/trip/:tripId — upsert review. Stars in Postgres,
// comment text in Firestore. reviewer_name denormalised from gateway identity.
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = Number(getRouterParam(event, 'tripId'))
  const { stars, comment } = await readBody(event)

  if (!stars || stars < 1 || stars > 5) throw createError({ statusCode: 400, statusMessage: 'stars must be 1–5' })

  const db = getDb()

  const { rows: tripRows } = await db.query('SELECT user_uid FROM trips WHERE id = $1', [tripId])
  if (!tripRows.length) throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  if (tripRows[0].user_uid === user.uid) throw createError({ statusCode: 403, statusMessage: 'Cannot review your own trip' })

  const reviewerName = user.name ?? user.email ?? user.uid
  const { rows } = await db.query(`
    INSERT INTO reviews (trip_id, reviewer_id, reviewer_name, stars)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (trip_id, reviewer_id) DO UPDATE
      SET stars = EXCLUDED.stars,
          reviewer_name = EXCLUDED.reviewer_name,
          updated_at = NOW()
    RETURNING *
  `, [tripId, user.uid, reviewerName, stars])

  const trimmed = (comment ?? '').trim()
  const fs = getFirestoreDb()
  const ref = fs.collection('reviews').doc(String(tripId)).collection('users').doc(user.uid)
  try {
    if (trimmed) {
      await ref.set({
        comment: trimmed,
        userName: reviewerName,
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      await ref.delete().catch(() => {})
    }
  } catch (e) {
    console.error('[reviews.post] firestore write failed:', e)
    throw createError({ statusCode: 500, statusMessage: `Firestore write failed: ${e.message}` })
  }

  return { ...rows[0], comment: trimmed }
})
