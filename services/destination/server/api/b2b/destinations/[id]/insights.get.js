// B2B marketing insights: Enterprise plan + role=destination_manager only.
// Returns aggregates over traveler stats with k-anonymity (k=10) — buckets < 10 dropped.

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePlan } from '@travelmanager/shared-auth'
import { pool } from '../../../../utils/db.js'

const K = 10

const handler = defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // Role check: enforce via tenant role table — for v1 read from claims.
  const role = user.role || event.context.tenant?.role || 'member'
  if (role !== 'destination_manager') {
    throw createError({ statusCode: 403, statusMessage: 'destination_manager role required' })
  }

  const id = Number(getRouterParam(event, 'id'))
  const { rows } = await pool().query(
    `SELECT period, agg_json FROM traveler_aggregates WHERE destination_id = $1 ORDER BY period DESC LIMIT 12`,
    [id]
  )

  // k-anonymity sweep: drop any bucket with count < K.
  const filtered = rows.map((r) => ({
    period: r.period,
    aggregates: maskBuckets(r.agg_json, K),
  }))
  return { destinationId: id, k: K, samples: filtered }
})

function maskBuckets(agg, k) {
  if (!agg || typeof agg !== 'object') return {}
  const out = {}
  for (const [dimension, buckets] of Object.entries(agg)) {
    if (typeof buckets !== 'object') continue
    out[dimension] = Object.fromEntries(
      Object.entries(buckets).filter(([, count]) => Number(count) >= k)
    )
  }
  return out
}

export default requirePlan('enterprise', handler, { createError })
