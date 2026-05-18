import { defineEventHandler, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const { rows } = await pool(event).query(
    `SELECT * FROM trips WHERE user_uid = $1 ORDER BY start_date DESC`, [user.uid])
  return rows
})
