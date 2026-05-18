import { defineEventHandler, getQuery } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const { country, severity } = getQuery(event)
  const conds = ['valid_to >= NOW()']
  const params = []
  if (country)  { params.push(String(country).toUpperCase()); conds.push(`country_iso2 = $${params.length}`) }
  if (severity) { params.push(String(severity));              conds.push(`severity = $${params.length}`) }
  const { rows } = await pool().query(
    `SELECT id, source, source_id, country_iso2, region, severity, summary, valid_from, valid_to, created_at
       FROM travel_warnings WHERE ${conds.join(' AND ')}
      ORDER BY created_at DESC LIMIT 100`,
    params
  )
  return rows
})
