import { defineEventHandler, getRouterParam } from 'h3'
import { fs } from '../../../utils/firestore.js'

export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId')
  const snap = await fs().collection('likes').doc(tripId).collection('users').get()
  const comments = []
  const likedUserIds = []
  snap.forEach((doc) => {
    likedUserIds.push(doc.id)
    const d = doc.data()
    if (d.comment) comments.push({ userId: doc.id, userName: d.userName, comment: d.comment, createdAt: d.createdAt })
  })
  return { count: snap.size, comments, likedUserIds }
})
