// Feed builder + relevance scoring. Auto-imported by Nitro.
import { getDb } from '@travelmanager/shared/db'
import { control } from './control.js'

// Relevance score: base 1.0 for a followed author, recency bonus decaying over
// 30 days. Kept simple and deterministic so the feed is explainable.
function score(startDate) {
  const ts = Date.parse(startDate)
  if (Number.isNaN(ts)) return 1 // no recency bonus for unparseable/missing dates
  const days = Math.max(0, (ts - Date.now()) / 86400000)
  const recency = Math.max(0, 1 - days / 30)
  return Number((1 + recency).toFixed(3))
}

// Fan-out a trip event to every follower of the author.
export async function buildFeedFromTrip(payload) {
  const db = getDb()
  const { tripId, userUid: authorUid, authorName, title, destination, startDate } = payload
  if (!tripId || !authorUid) return 0

  const { rows: followers } = await db.query(
    'SELECT follower_uid FROM follows WHERE followee_uid = $1',
    [authorUid]
  )
  if (!followers.length) return 0

  const s = score(startDate)
  let written = 0
  for (const f of followers) {
    const { rowCount } = await db.query(
      `INSERT INTO feed_entries (user_uid, trip_id, author_uid, author_name, title, destination, score)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_uid, trip_id) DO UPDATE SET
         title=EXCLUDED.title, destination=EXCLUDED.destination,
         score=EXCLUDED.score, author_name=EXCLUDED.author_name`,
      [f.follower_uid, tripId, authorUid, authorName ?? '', title ?? '', destination ?? '', s]
    )
    written += rowCount || 0
  }
  control.feed.processed++
  control.feed.lastMessageAt = new Date().toISOString()
  return written
}
