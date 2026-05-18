import { defineEventHandler, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const tenantId = event.context.tenant?.tenantId ?? 'public'
  const { rows } = await pool().query(
    `SELECT id, template, subject, data, read_at, created_at
       FROM in_app_notifications
      WHERE user_uid = $1 AND tenant_id = $2
      ORDER BY created_at DESC LIMIT 50`,
    [user.uid, tenantId]
  )
  return rows
})
