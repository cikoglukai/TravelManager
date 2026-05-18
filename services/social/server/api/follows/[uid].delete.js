import { defineEventHandler, getRouterParam, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const target = getRouterParam(event, 'uid')
  await pool().query(
    `DELETE FROM follows WHERE follower_uid = $1 AND followee_uid = $2`,
    [user.uid, target]
  )
  return { ok: true }
})
