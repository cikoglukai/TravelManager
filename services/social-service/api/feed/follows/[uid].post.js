// POST /api/feed/follows/:uid — follow another traveller.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const followee = getRouterParam(event, 'uid')
  if (!followee || followee === user.uid) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid followee' })
  }

  const db = getDb()
  await db.query(
    `INSERT INTO follows (follower_uid, followee_uid) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [user.uid, followee]
  )
  return { success: true }
})
