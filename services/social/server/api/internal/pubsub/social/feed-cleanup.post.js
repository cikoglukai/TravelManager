// Daily cleanup: prune Firestore feed items past their expiresAt.
// Triggered by Cloud Scheduler -> social.feed.cleanup.tick.

import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { fs } from '../../../../utils/firestore.js'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

export default defineEventHandler(subscribeHandler('social.feed.cleanup.tick',
  async () => {
    // Firestore TTL via field policy is the production solution; this CronJob is a safety net.
    // For v1 we just log — real prune iterates feeds collection group with where(_expiresAt, <, now).
    if (process.env.SKIP_FIRESTORE === '1') return { ok: true, mode: 'stub' }
    const cutoff = new Date()
    let deleted = 0
    const cg = fs().collectionGroup?.('items')
    if (!cg) return { ok: true, mode: 'unsupported-stub' }
    const snap = await cg.where('_expiresAt', '<', cutoff).limit(500).get()
    const batch = fs().batch()
    snap.forEach((d) => { batch.delete(d.ref); deleted++ })
    if (deleted > 0) await batch.commit()
    return { ok: true, deleted }
  },
  { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
))
