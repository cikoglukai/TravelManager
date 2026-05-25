// POST /api/likes/trip/:tripId — add like + optional comment (auth required).
import { getFirestoreDb } from '@travelmanager/shared/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = getRouterParam(event, 'tripId')
  const { comment } = await readBody(event)

  const db = getFirestoreDb()
  await db.collection('likes').doc(tripId).collection('users').doc(ctx.uid).set({
    comment: comment?.trim() ?? '',
    userName: ctx.name ?? ctx.email ?? ctx.uid,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { success: true }
})
