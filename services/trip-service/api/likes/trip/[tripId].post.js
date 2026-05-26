// POST /api/likes/trip/:tripId — add like + optional comment (auth required).
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { getDb } from '@travelmanager/shared/db'
import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = getRouterParam(event, 'tripId')
  const { comment } = await readBody(event)

  const fs = getFirestoreDb()
  const ref = fs.collection('likes').doc(tripId).collection('users').doc(ctx.uid)
  // Was this user already a liker? (editing a comment must not double-count.)
  const existing = await ref.get()
  await ref.set({
    comment: comment?.trim() ?? '',
    userName: ctx.name ?? ctx.email ?? ctx.uid,
    uid: ctx.uid,            // enables the collectionGroup "liked by me" query
    createdAt: FieldValue.serverTimestamp(),
  })

  // Bump the denormalised tally only on a genuinely new like.
  if (!existing.exists) {
    await getDb().query(
      'UPDATE trips SET like_count = like_count + 1 WHERE id = $1',
      [Number(tripId)]
    ).catch((e) => console.error('[likes.post] like_count bump failed', e?.message || e))
  }

  return { success: true }
})
