import { defineEventHandler } from 'h3'
import { pool } from '../utils/db.js'

export default defineEventHandler(async () => {
  const r = await pool().query('SELECT 1 AS ok')
  return {
    service: 'notification',
    ok: r.rows[0].ok === 1,
    sendgrid: Boolean(process.env.SENDGRID_API_KEY),
    ts: new Date().toISOString(),
  }
})
