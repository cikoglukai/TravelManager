// GET /api/likes/trip/:tripId — public, no auth.
import { getFirestoreDb } from '@travelmanager/shared/firebase'

export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId')

  const db = getFirestoreDb()
  const snap = await db.collection('likes').doc(tripId).collection('users').get()

  const comments = []
  const likedUserIds = []

  snap.forEach(doc => {
    likedUserIds.push(doc.id)
    const d = doc.data()
    if (d.comment) {
      comments.push({
        userId: doc.id,
        userName: d.userName,
        comment: d.comment,
        createdAt: d.createdAt,
      })
    }
  })

  return { count: snap.size, comments, likedUserIds }
})
