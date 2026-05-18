import { defineEventHandler } from 'h3'
import { pool } from '../utils/db.js'

export default defineEventHandler(async () => {
  const r = await pool().query('SELECT 1 AS ok')
  return {
    service: 'travel-info',
    ok: r.rows[0].ok === 1,
    sources: {
      gdacs: true,
      reliefweb: true,
      openweather: Boolean(process.env.OPENWEATHER_API_KEY),
    },
    ts: new Date().toISOString(),
  }
})
