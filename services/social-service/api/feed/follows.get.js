// GET /api/feed/follows — UIDs the authenticated user follows.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const db = getDb()
  const { rows } = await db.query(
    'SELECT followee_uid FROM follows WHERE follower_uid = $1',
    [user.uid]
  )
  return rows.map(r => r.followee_uid)
})
