// GET /api/likes/trip/:tripId — public, no auth required
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId')

  const db = getFirestore(getApp(), 'onecloudaway-db')
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
