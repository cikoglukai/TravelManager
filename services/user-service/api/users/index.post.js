// POST /api/users
// Upserts a user row on first sign-up / first Google login.
// Identity comes from the gateway-verified token (event.context.user).
// `name` in the body is used only when creating a new row; ignored afterwards.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { name } = await readBody(event)

  const db = getDb()

  const { rows } = await db.query(
    `INSERT INTO users (firebase_uid, email, name, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (firebase_uid) DO UPDATE
       SET email = EXCLUDED.email
     RETURNING firebase_uid, email, name, bio, home_city, avatar_url, tenant_id, role, created_at`,
    [ctx.uid, ctx.email ?? '', name?.trim() ?? ctx.name ?? ctx.email ?? '', ctx.tenantId ?? 'default']
  )

  return rows[0]
})
