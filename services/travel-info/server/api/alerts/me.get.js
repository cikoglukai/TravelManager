import { defineEventHandler, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const { rows } = await pool().query(
    `SELECT a.trip_id, a.warning_id, a.kind, a.sent_at,
            w.country_iso2, w.region, w.severity, w.summary, w.source
       FROM alert_log a JOIN travel_warnings w ON w.id = a.warning_id
      WHERE a.user_uid = $1
      ORDER BY a.sent_at DESC LIMIT 50`,
    [user.uid]
  )
  return rows
})
