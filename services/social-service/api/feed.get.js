// GET /api/feed — the authenticated user's feed: trips by people they follow.
// Computed at query time (follows live here, trips are fetched from the Trip
// service) so it works without Pub/Sub and reflects follows + existing trips
// immediately. Gated to Standard+ at the gateway; enforced here too.
import { getDb } from '@travelmanager/shared/db'
import { planAllows } from '@travelmanager/shared/tiers'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!planAllows(user.plan, 'feed')) {
    throw createError({ statusCode: 403, statusMessage: 'The personalized feed requires the Standard plan or higher' })
  }

  const db = getDb()
  const { rows: follows } = await db.query(
    'SELECT followee_uid FROM follows WHERE follower_uid = $1',
    [user.uid]
  )
  if (!follows.length) return []

  const uids = follows.map(f => f.followee_uid).join(',')
  const tripServiceUrl = process.env.TRIP_SERVICE_URL || 'http://localhost:3002'
  const trips = await $fetch('/api/internal/trips-by-authors', {
    baseURL: tripServiceUrl,
    query: { uids },
  }).catch((e) => { console.error('[social-service] trips-by-authors fetch failed', e?.message || e); return [] })

  // Newest first; a small popularity nudge so liked trips edge upward.
  return [...trips]
    .map(t => ({ ...t, score: Number((1 + Math.min(t.like_count || 0, 10) * 0.05).toFixed(3)) }))
    .sort((a, b) => (b.score - a.score) || (Date.parse(b.created_at) - Date.parse(a.created_at)))
    .slice(0, 100)
})
