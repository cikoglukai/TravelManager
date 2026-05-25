// POST /api/events/newsletter — Pub/Sub PUSH target for NewsletterReady.
import { handleNewsletter } from '../../utils/notify.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const msg = body?.message
  if (!msg?.data) return { ok: true, skipped: 'no message' }
  let payload
  try {
    payload = JSON.parse(Buffer.from(msg.data, 'base64').toString())
  } catch (e) {
    console.error('[notification-service] dropping unparseable newsletter message', e)
    return { ok: true, dropped: 'unparseable' }
  }
  await handleNewsletter(payload)
  return { ok: true }
})
