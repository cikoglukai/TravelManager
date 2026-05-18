import { defineEventHandler, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const tenantId = event.context.tenant?.tenantId ?? 'public'

  const { rows } = await pool().query(
    `SELECT firebase_uid, email, name, bio, home_city, avatar_url, tenant_id, created_at
       FROM users WHERE firebase_uid = $1 AND tenant_id = $2`,
    [user.uid, tenantId]
  )
  if (rows.length === 0) {
    // Lazy-create on first hit.
    const { rows: created } = await pool().query(
      `INSERT INTO users (firebase_uid, email, name, tenant_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (firebase_uid, tenant_id) DO NOTHING
       RETURNING firebase_uid, email, name, bio, home_city, avatar_url, tenant_id, created_at`,
      [user.uid, user.email ?? '', user.name ?? user.email ?? 'Traveller', tenantId]
    )
    return created[0]
  }
  return rows[0]
})
