// Cluster-internal endpoint: list tenants filtered by plan. Consumed by tenant-operator CronJob.
// AuthZ: trust intra-cluster traffic (NetworkPolicy restricts to shared-services namespace).

import { defineEventHandler, getQuery } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const { plan } = getQuery(event)
  if (plan) {
    const plans = String(plan).split(',').map((p) => p.trim())
    const { rows } = await pool().query(
      `SELECT id, name, plan, created_at FROM tenants WHERE plan = ANY($1::text[])`,
      [plans]
    )
    return rows
  }
  const { rows } = await pool().query(`SELECT id, name, plan, created_at FROM tenants`)
  return rows
})
