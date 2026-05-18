import { defineEventHandler, createError } from 'h3'
import { fs } from '../../utils/firestore.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const snap = await fs()
    .collection('feeds').doc(user.uid).collection('items')
    .orderBy('occurredAt', 'desc')
    .limit(20)
    .get()
  const items = []
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
  return items
})
