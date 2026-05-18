import { defineEventHandler, readBody, createError } from 'h3'
import { pool } from '../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const tenantId = event.context.tenant?.tenantId ?? 'public'
  const { email, push, in_app } = await readBody(event)
  await pool().query(
    `INSERT INTO preferences (user_uid, tenant_id, email_enabled, push_enabled, in_app_enabled, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (user_uid, tenant_id) DO UPDATE
       SET email_enabled = EXCLUDED.email_enabled,
           push_enabled  = EXCLUDED.push_enabled,
           in_app_enabled = EXCLUDED.in_app_enabled,
           updated_at = NOW()`,
    [user.uid, tenantId, !!email, !!push, in_app !== false]
  )
  return { ok: true }
})
