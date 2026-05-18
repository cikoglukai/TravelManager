import { defineEventHandler } from 'h3'
import { pool } from '../utils/db.js'

export default defineEventHandler(async () => {
  const r = await pool().query('SELECT 1 AS ok')
  return { service: 'destination', ok: r.rows[0].ok === 1, ts: new Date().toISOString() }
})
