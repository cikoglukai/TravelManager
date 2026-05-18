import { defineEventHandler } from 'h3'
import { pool } from '../utils/db.js'

export default defineEventHandler(async (event) => {
  const r = await pool(event).query('SELECT 1 AS ok')
  return { service: 'trip', ok: r.rows[0].ok === 1, ts: new Date().toISOString() }
})
