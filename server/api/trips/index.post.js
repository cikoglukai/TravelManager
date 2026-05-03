// POST /api/trips — creates a new trip owned by the authenticated user
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const body = await readBody(event)

  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { title, destination, start_date, short_description, detail_description } = body

  if (!title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (short_description.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Short description must be <= 80 chars' })
  }

  const db = getDb()

  // Lazy-upsert the Postgres user row.
  // Firebase Auth persists across DB resets (IndexedDB on the client), so a
  // signed-in user can hit /api/trips before /api/users has run for them.
  // Without this, the trips.user_uid FK throws 23503.
  await db.query(
    `INSERT INTO users (firebase_uid, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO NOTHING`,
    [user.uid, user.email ?? '', user.name ?? user.email ?? 'Traveller']
  )

  const { rows } = await db.query(
    `INSERT INTO trips
     (user_uid, title, destination, start_date, short_description, detail_description)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [user.uid, title.trim(), destination.trim(), start_date, short_description.trim(), detail_description?.trim() ?? '']
  )
  return rows[0]
})
