// Pub/Sub push handler for travel.warning.published / travel.weather.snapshot / trip.created / trip.updated.
// Joins active trips with new warning by country + date range and emits notification.requested per match.
//
// Idempotency on (user_uid, trip_id, warning_id) via alert_log unique key.

import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler, publish } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { pool } from '../../../../utils/db.js'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

async function matchAndAlert({ warning }) {
  // trip lookup is cross-service; for v1 we keep a denormalized active_trips cache populated by
  // trip.* event consumers. Schema in init-db.js.
  const { rows } = await pool().query(
    `SELECT t.trip_id, t.user_uid, t.tenant_id
       FROM active_trips t
      WHERE t.country_iso2 = $1
        AND t.start_date <= $2::date
        AND t.end_date   >= $3::date`,
    [warning.country, warning.validTo.slice(0, 10), warning.validFrom.slice(0, 10)]
  )
  let alerts = 0
  for (const t of rows) {
    const ins = await pool().query(
      `INSERT INTO alert_log (user_uid, trip_id, warning_id, kind, tenant_id, sent_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_uid, trip_id, warning_id) DO NOTHING
       RETURNING id`,
      [t.user_uid, t.trip_id, warning.warningId, 'travel_warning', t.tenant_id]
    )
    if (ins.rowCount === 0) continue   // already alerted
    await publish('notification.requested', {
      userUid: t.user_uid,
      channel: ['email', 'in_app'],
      template: 'travel_warning',
      data: warning,
      priority: warning.severity === 'extreme' || warning.severity === 'danger' ? 'high' : 'normal',
    }, { tenantId: t.tenant_id })
    alerts++
  }
  return { alerts }
}

// Single handler that branches on topic — registered against multiple subs.
export default defineEventHandler(async (event) => {
  // The topic name comes via Pub/Sub message attributes.
  const body = await readBody(event)
  const attrs = body?.message?.attributes || {}
  const topic = attrs.googclient_topicname || attrs.topic || event.context.pubsubTopic

  if (topic === 'travel.warning.published') {
    return subscribeHandler('travel.warning.published',
      (_e, p) => matchAndAlert({ warning: p }),
      { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
    )(event)
  }
  if (topic === 'trip.created' || topic === 'trip.updated') {
    return subscribeHandler(topic,
      async (_e, p) => {
        await pool().query(
          `INSERT INTO active_trips (trip_id, user_uid, tenant_id, country_iso2, start_date, end_date)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (trip_id) DO UPDATE
             SET country_iso2 = EXCLUDED.country_iso2,
                 start_date   = EXCLUDED.start_date,
                 end_date     = EXCLUDED.end_date`,
          [p.tripId, p.userUid, p.tenantId, destinationToIso2(p.destination), p.startDate, p.endDate]
        )
        return { ok: true }
      },
      { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
    )(event)
  }
  // Fall-through: weather snapshots have no immediate match action in v1.
  return { ok: true, ignored: topic }
})

function destinationToIso2(dest) {
  // Heuristic — final implementation joins via destination service for canonical mapping.
  const m = { Paris: 'FR', London: 'GB', Tokyo: 'JP', Rome: 'IT', Berlin: 'DE', Madrid: 'ES', 'New York': 'US' }
  for (const [k, v] of Object.entries(m)) if (String(dest).includes(k)) return v
  return null
}
