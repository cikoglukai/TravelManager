// Subscriber for trip.created — increments traveler_aggregates per-destination per-period.

import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { pool } from '../../../../utils/db.js'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

export default defineEventHandler(subscribeHandler('trip.created',
  async (_event, payload) => {
    const period = payload.startDate.slice(0, 7) + '-01'  // month bucket
    const destinationId = await mapDestination(payload.destination)
    if (!destinationId) return { ok: true, skipped: 'unknown destination' }

    await pool().query(
      `INSERT INTO traveler_aggregates (destination_id, period, agg_json)
       VALUES ($1,$2, jsonb_build_object('origin_country', jsonb_build_object($3, 1), 'count', 1))
       ON CONFLICT (destination_id, period) DO UPDATE
         SET agg_json = jsonb_set(
               COALESCE(traveler_aggregates.agg_json, '{}'::jsonb),
               ARRAY['origin_country', $3],
               to_jsonb(COALESCE((traveler_aggregates.agg_json->'origin_country'->>$3)::int, 0) + 1)
             )`,
      [destinationId, period, originCountry(payload.origin) || 'unknown']
    )
    return { ok: true }
  },
  { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
))

async function mapDestination(name) {
  if (!name) return null
  const { rows } = await pool().query(
    `SELECT id FROM destinations WHERE city ILIKE $1 OR country ILIKE $1 LIMIT 1`,
    [`%${name}%`]
  )
  return rows[0]?.id ?? null
}

function originCountry(origin) {
  // Heuristic for v1; final implementation maps via destination service or geo-IP.
  return String(origin || '').split(',').pop()?.trim() || null
}
