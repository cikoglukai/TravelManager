import { defineEventHandler, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const { rows } = await pool().query(
    `SELECT followee_uid FROM follows WHERE follower_uid = $1`, [user.uid])
  return rows.map((r) => r.followee_uid)
})
