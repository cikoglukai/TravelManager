// POST /api/reviews/trip/:tripId — upsert review.
// Stars upserted into Postgres. Comment text persisted in Firestore so all
// free-text "comments" (likes, reviews) live in NoSQL per Ex4.
import { getApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getDb } from '~~/server/utils/db.js'

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

  const { rows } = await db.query(`
    INSERT INTO reviews (trip_id, reviewer_id, stars)
    VALUES ($1, $2, $3)
    ON CONFLICT (trip_id, reviewer_id) DO UPDATE
      SET stars = EXCLUDED.stars,
          updated_at = NOW()
    RETURNING *
  `, [tripId, user.uid, stars])

  const trimmed = (comment ?? '').trim()
  const fs = getFirestore(getApp(), 'onecloudaway-db')
  const ref = fs.collection('reviews').doc(String(tripId)).collection('users').doc(user.uid)
  console.log('[reviews.post] tripId=%s uid=%s commentLen=%d', tripId, user.uid, trimmed.length)
  try {
    if (trimmed) {
      await ref.set({
        comment: trimmed,
        userName: user.name ?? user.email ?? user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log('[reviews.post] firestore set OK')
    } else {
      await ref.delete().catch(() => {})
    }
  } catch (e) {
    console.error('[reviews.post] firestore write failed:', e)
    throw createError({ statusCode: 500, statusMessage: `Firestore write failed: ${e.message}` })
  }

  return { ...rows[0], comment: trimmed }
})
