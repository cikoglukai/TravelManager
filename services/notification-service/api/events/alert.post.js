// POST /api/events/alert — Pub/Sub PUSH target for TravelAlert (internal).
import { handleTravelAlert } from '../../utils/notify.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const msg = body?.message
  if (!msg?.data) return { ok: true, skipped: 'no message' }
  let payload
  try {
    payload = JSON.parse(Buffer.from(msg.data, 'base64').toString())
  } catch (e) {
    console.error('[notification-service] dropping unparseable alert message', e)
    return { ok: true, dropped: 'unparseable' }
  }
  await handleTravelAlert(payload)
  return { ok: true }
})
