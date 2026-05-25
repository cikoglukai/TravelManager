// GET /api/feed — precomputed personalized feed for the authenticated user.
// Gated to Standard+ at the gateway; defense-in-depth check here too.
import { getDb } from '@travelmanager/shared/db'
import { planAllows } from '@travelmanager/shared/tiers'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  // Defense in depth: the gateway gates this too, but enforce here in case a
  // caller reaches the service directly.
  if (!planAllows(user.plan, 'feed')) {
    throw createError({ statusCode: 403, statusMessage: 'The personalized feed requires the Standard plan or higher' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `SELECT trip_id, author_uid, author_name, title, destination, score, created_at
     FROM feed_entries
     WHERE user_uid = $1
     ORDER BY score DESC, created_at DESC
     LIMIT 100`,
    [user.uid]
  )
  return rows
})
