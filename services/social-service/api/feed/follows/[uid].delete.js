// DELETE /api/feed/follows/:uid — unfollow.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const followee = getRouterParam(event, 'uid')
  const db = getDb()
  await db.query(
    'DELETE FROM follows WHERE follower_uid = $1 AND followee_uid = $2',
    [user.uid, followee]
  )
  return { success: true }
})
