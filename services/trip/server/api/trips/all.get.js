import { defineEventHandler, getQuery } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`
    const { rows } = await pool(event).query(
      `SELECT t.*, u.name AS user_name, u.avatar_url AS user_avatar
         FROM trips t LEFT JOIN users u ON u.firebase_uid = t.user_uid
        WHERE t.title ILIKE $1 OR t.destination ILIKE $1 OR t.short_description ILIKE $1
        ORDER BY t.start_date DESC LIMIT 100`, [like])
    return rows
  }
  const { rows } = await pool(event).query(
    `SELECT t.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM trips t LEFT JOIN users u ON u.firebase_uid = t.user_uid
      ORDER BY t.start_date DESC LIMIT 100`)
  return rows
})
