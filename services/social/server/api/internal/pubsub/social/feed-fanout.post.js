// Fan-out-on-write: when a trip is created/updated or social activity occurs, write a feed item
// into each follower's Firestore inbox `feeds/{followerUid}/items/{eventId}`.

import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { pool } from '../../../../utils/db.js'
import { fs } from '../../../../utils/firestore.js'
import { FieldValue } from 'firebase-admin/firestore'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const attrs = body?.message?.attributes || {}
  const topic = attrs.googclient_topicname || attrs.topic
  // Default to social.activity envelope if attribute missing — h3 testing convenience.
  return subscribeHandler(topic || 'social.activity',
    async (_e, p) => {
      const author = p.actorUid || p.userUid
      if (!author) return { ok: true, skipped: 'no-author' }

      // Look up followers — capped at 10k for v1 (celebrity guard kicks in above).
      const { rows } = await pool().query(
        `SELECT follower_uid FROM follows WHERE followee_uid = $1 LIMIT 10000`,
        [author]
      )
      const expiresAt = new Date(Date.now() + 90 * 86400 * 1000)
      const item = {
        eventId:    p.eventId,
        topic:      topic || 'social.activity',
        author,
        verb:       p.verb || 'trip_published',
        objectId:   String(p.tripId ?? p.objectId ?? ''),
        destination: p.destination ?? null,
        occurredAt: p.occurredAt,
        expiresAt:  FieldValue.serverTimestamp(),
        _expiresAt: expiresAt,
      }
      const batch = fs().batch?.() || null
      if (batch) {
        let i = 0
        for (const r of rows) {
          const ref = fs().collection('feeds').doc(r.follower_uid).collection('items').doc(p.eventId)
          batch.set(ref, item)
          if (++i % 400 === 0) { await batch.commit() }
        }
        if (i % 400 !== 0) await batch.commit()
      } else {
        // Fallback (stub Firestore) — write sequentially.
        for (const r of rows) {
          await fs().collection('feeds').doc(r.follower_uid).collection('items').doc(p.eventId).set(item)
        }
      }
      return { ok: true, fanout: rows.length }
    },
    { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
  )(event)
})
