import { defineEventHandler, getRouterParam, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad id' })
  await pool().query(
    `DELETE FROM push_subscriptions WHERE id = $1 AND user_uid = $2`,
    [id, user.uid]
  )
  return { ok: true }
})
