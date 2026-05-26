// GET /api/trips/recommended — "For You": public trips ranked by relevance to
// the caller, beyond who they follow. Query-time (no Pub/Sub), so it works the
// same locally and in prod.
//
// Signals (all owned by this service):
//   • interest  — the trip's country matches a country the user has travelled to
//                 (own trips) or liked (Firestore likes, reverse-looked-up).
//   • popular   — denormalised like_count (trending).
//   • recency   — created_at, used only as a tiebreak.
// New users with no history fall through to a pure popularity ranking.
import { getDb } from '@travelmanager/shared/db'
import { getFirestoreDb } from '@travelmanager/shared/firebase'

export default defineEventHandler(async (event) => {
  const me = event.context.user?.uid || null
  const db = getDb()

  // ── Build the interest set: countries from the user's own + liked trips ──
  const interest = new Set()
  if (me) {
    const { rows: own } = await db.query(
      `SELECT DISTINCT dest_country FROM trips
       WHERE user_uid = $1 AND dest_country IS NOT NULL`,
      [me]
    )
    own.forEach(r => interest.add(r.dest_country))

    // Trips this user liked → their countries. collectionGroup needs the `uid`
    // field (written by the like handler) + a composite index in real Firestore.
    try {
      const snap = await getFirestoreDb().collectionGroup('users').where('uid', '==', me).get()
      const likedIds = snap.docs
        .map(d => Number(d.ref.parent.parent?.id))
        .filter(Boolean)
      if (likedIds.length) {
        const { rows: liked } = await db.query(
          `SELECT DISTINCT dest_country FROM trips
           WHERE id = ANY($1::int[]) AND dest_country IS NOT NULL`,
          [likedIds]
        )
        liked.forEach(r => interest.add(r.dest_country))
      }
    } catch (e) {
      console.error('[recommended] liked-trips lookup failed (non-fatal)', e?.message || e)
    }
  }

  const interestArr = [...interest]

  // ── Rank ──────────────────────────────────────────────────────────────────
  const { rows } = await db.query(
    `SELECT id, title, destination, dest_country, start_date, short_description,
            user_uid, author_name, COALESCE(like_count, 0) AS like_count,
            (dest_country = ANY($1::text[])) AS interest_match,
            ( CASE WHEN dest_country = ANY($1::text[]) THEN 2 ELSE 0 END
              + LEAST(COALESCE(like_count, 0), 10) * 0.15 ) AS score
     FROM trips
     WHERE ($2::text IS NULL OR user_uid <> $2)
     ORDER BY score DESC, like_count DESC, created_at DESC
     LIMIT 30`,
    [interestArr, me]
  )

  return rows.map(r => ({
    ...r,
    reason: r.interest_match ? 'interest' : (r.like_count > 0 ? 'popular' : 'new'),
  }))
})
