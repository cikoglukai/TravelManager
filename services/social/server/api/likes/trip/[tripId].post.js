import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { fs } from '../../../utils/firestore.js'
import { publish } from '@travelmanager/shared-events'
import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const tripId = getRouterParam(event, 'tripId')
  const { comment } = await readBody(event)

  await fs().collection('likes').doc(tripId).collection('users').doc(user.uid).set({
    comment: comment?.trim() ?? '',
    userName: user.name ?? user.email ?? user.uid,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Publish social.activity so feed-fanout writes to followers' feeds.
  await publish('social.activity', {
    actorUid: user.uid,
    verb: 'liked',
    objectId: String(tripId),
  }, { tenantId: event.context.tenant.tenantId })

  return { ok: true }
})
