import { defineEventHandler, getRouterParam, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const target = getRouterParam(event, 'uid')
  if (target === user.uid) throw createError({ statusCode: 400, statusMessage: 'Cannot follow yourself' })

  await pool().query(
    `INSERT INTO follows (follower_uid, followee_uid, tenant_id, created_at)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (follower_uid, followee_uid) DO NOTHING`,
    [user.uid, target, event.context.tenant.tenantId]
  )
  return { ok: true }
})
