// POST /api/events/trip — Pub/Sub PUSH delivery target (alternative to the pull
// subscriber). Decodes the push envelope and runs the feed builder. Internal;
// not routed through the public gateway.
import { buildFeedFromTrip } from '../../utils/feed.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const msg = body?.message
  if (!msg?.data) return { ok: true, skipped: 'no message' }

  let payload
  try {
    payload = JSON.parse(Buffer.from(msg.data, 'base64').toString())
  } catch (e) {
    // Poison message: ack it (200) so Pub/Sub stops redelivering. Log for triage.
    console.error('[social-service] dropping unparseable push message', e)
    return { ok: true, dropped: 'unparseable' }
  }
  const written = await buildFeedFromTrip(payload)
  return { ok: true, written }
})
