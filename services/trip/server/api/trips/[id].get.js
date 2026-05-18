import { defineEventHandler, getRouterParam, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad id' })
  const { rows } = await pool(event).query(
    `SELECT t.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM trips t LEFT JOIN users u ON u.firebase_uid = t.user_uid
      WHERE t.id = $1`, [id])
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  return rows[0]
})
