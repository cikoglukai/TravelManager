import { defineEventHandler, readBody, createError } from 'h3'
import { pool } from '../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const tenantId = event.context.tenant?.tenantId ?? 'public'

  const sub = await readBody(event)
  if (!sub?.endpoint || !sub?.keys?.auth || !sub?.keys?.p256dh) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid subscription' })
  }

  const { rows } = await pool().query(
    `INSERT INTO push_subscriptions (user_uid, tenant_id, endpoint, subscription_json)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_uid, tenant_id, endpoint) DO UPDATE
       SET subscription_json = EXCLUDED.subscription_json, updated_at = NOW()
     RETURNING id`,
    [user.uid, tenantId, sub.endpoint, JSON.stringify(sub)]
  )
  return { ok: true, id: rows[0].id }
})
