import { defineEventHandler } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async () => {
  const { rows } = await pool().query(
    `SELECT id, country, city, emoji, description FROM destinations ORDER BY country ASC`
  )
  return rows
})
