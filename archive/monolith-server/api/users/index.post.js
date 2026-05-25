// POST /api/users
// Upserts a user row on first sign-up / first Google login.
// Identity comes from the verified Firebase token (event.context.user).
// `name` in the body is used only when creating a new row; ignored on subsequent calls.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { name } = await readBody(event)

  const db = getDb()

  const { rows } = await db.query(
    `INSERT INTO users (firebase_uid, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE
       SET email = EXCLUDED.email
     RETURNING firebase_uid, email, name, bio, home_city, avatar_url, created_at`,
    [ctx.uid, ctx.email ?? '', name?.trim() ?? ctx.name ?? ctx.email ?? '']
  )

  return rows[0]
})
