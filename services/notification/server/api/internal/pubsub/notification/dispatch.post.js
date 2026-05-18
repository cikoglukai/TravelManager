import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler, publish } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { sendEmail, sendInApp, sendPush } from '../../../../utils/channels.js'
import { pool } from '../../../../utils/db.js'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

export default defineEventHandler(subscribeHandler('notification.requested',
  async (event, payload) => {
    // Idempotency: skip if eventId already processed (DLQ replay safety).
    const seen = await pool().query(`SELECT 1 FROM delivery_log WHERE event_id = $1 LIMIT 1`, [payload.eventId])
    if (seen.rowCount > 0) return { ok: true, deduped: true }

    // Look up user contact + tenant branding (in real prod via identity-tenant HTTP).
    // For now, fall back to placeholder data.
    const userQ = await pool().query(`SELECT email, name, locale FROM users_cache WHERE user_uid = $1 AND tenant_id = $2`,
      [payload.userUid, payload.tenantId])
    const u = userQ.rows[0] || { email: `${payload.userUid}@example.local`, name: 'Traveller', locale: 'en' }

    const prefsQ = await pool().query(
      `SELECT email_enabled, push_enabled, in_app_enabled FROM preferences WHERE user_uid = $1 AND tenant_id = $2`,
      [payload.userUid, payload.tenantId])
    const prefs = prefsQ.rows[0] || { email_enabled: true, push_enabled: true, in_app_enabled: true }

    const channels = (payload.channel || []).filter(Boolean)
    const results = []
    for (const ch of channels) {
      try {
        let r
        if (ch === 'email' && prefs.email_enabled)
          r = await sendEmail({ to: u.email, template: payload.template, data: payload.data })
        else if (ch === 'in_app' && prefs.in_app_enabled)
          r = await sendInApp({ userUid: payload.userUid, tenantId: payload.tenantId, template: payload.template, data: payload.data })
        else if (ch === 'push' && prefs.push_enabled)
          r = await sendPush({ userUid: payload.userUid, tenantId: payload.tenantId, template: payload.template, data: payload.data })
        else
          r = { ok: true, skipped: 'pref-disabled-or-unknown-channel' }
        results.push({ ch, ...r })
      } catch (e) {
        results.push({ ch, ok: false, error: e.message })
      }
    }

    await pool().query(
      `INSERT INTO delivery_log (event_id, user_uid, tenant_id, template, channels_json, results_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [payload.eventId, payload.userUid, payload.tenantId, payload.template,
       JSON.stringify(channels), JSON.stringify(results)]
    )

    // Emit notification.delivered per successful channel for audit.
    for (const r of results.filter(r => r.ok && !r.skipped)) {
      await publish('notification.delivered', {
        notificationId: payload.eventId,
        channel: r.ch,
        deliveredAt: new Date().toISOString(),
      }, { tenantId: payload.tenantId })
    }

    return { ok: true, results }
  },
  { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
))
