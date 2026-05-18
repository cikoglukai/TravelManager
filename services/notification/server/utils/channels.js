// Channel adapters: email (SendGrid), push (Web Push via VAPID), in_app (DB-backed).
// Each adapter returns { ok, providerId } or throws so the dispatcher logs failure.

import sg from '@sendgrid/mail'
import webpush from 'web-push'
import { pool } from './db.js'

let _vapidReady = false
function vapid() {
  if (_vapidReady) return webpush
  const pub = process.env.WEBPUSH_VAPID_PUBLIC_KEY
  const priv = process.env.WEBPUSH_VAPID_PRIVATE_KEY
  const subject = process.env.WEBPUSH_VAPID_SUBJECT || 'mailto:noreply@travelmanager.app'
  if (!pub || !priv) return null
  webpush.setVapidDetails(subject, pub, priv)
  _vapidReady = true
  return webpush
}

let _sgReady = false
function sendgrid() {
  if (_sgReady) return sg
  const k = process.env.SENDGRID_API_KEY
  if (!k) return null
  sg.setApiKey(k)
  _sgReady = true
  return sg
}

export async function sendEmail({ to, fromName, fromEmail, template, data, tenantBranding }) {
  const sgi = sendgrid()
  if (!sgi) {
    console.warn('[notification][email] SENDGRID_API_KEY missing — dropping mail to', to)
    return { ok: false, reason: 'no-sendgrid-key' }
  }
  const subject = renderSubject(template, data)
  const html = renderHtml(template, data, tenantBranding)
  const [resp] = await sgi.send({
    to,
    from: { email: fromEmail || process.env.SENDGRID_FROM_EMAIL, name: fromName || 'TravelManager' },
    subject,
    html,
    text: stripHtml(html),
  })
  return { ok: resp.statusCode < 300, providerId: resp.headers?.['x-message-id'] }
}

export async function sendInApp({ userUid, tenantId, template, data }) {
  const subject = renderSubject(template, data)
  await pool().query(
    `INSERT INTO in_app_notifications (user_uid, tenant_id, template, subject, data, created_at)
     VALUES ($1,$2,$3,$4,$5, NOW())`,
    [userUid, tenantId, template, subject, JSON.stringify(data)]
  )
  return { ok: true }
}

export async function sendPush({ userUid, tenantId, template, data }) {
  const wp = vapid()
  if (!wp) {
    console.warn('[notification][push] WEBPUSH_VAPID_* missing — dropping push for', userUid)
    return { ok: false, reason: 'no-vapid-keys' }
  }
  const { rows } = await pool().query(
    `SELECT id, subscription_json FROM push_subscriptions WHERE user_uid = $1 AND tenant_id = $2`,
    [userUid, tenantId]
  )
  if (rows.length === 0) return { ok: true, skipped: 'no-subscription' }

  const payload = JSON.stringify({
    title: renderSubject(template, data),
    body:  data.summary || data.weekOf || `Notification: ${template}`,
    url:   data.url || '/',
    template,
  })

  const results = await Promise.allSettled(rows.map((r) =>
    wp.sendNotification(r.subscription_json, payload).catch(async (err) => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool().query(`DELETE FROM push_subscriptions WHERE id = $1`, [r.id])
      }
      throw err
    })
  ))
  const delivered = results.filter((r) => r.status === 'fulfilled').length
  return { ok: delivered > 0, delivered, failed: results.length - delivered }
}

function renderSubject(template, data) {
  switch (template) {
    case 'travel_warning':
      return `[Travel alert] ${data.country ?? ''}: ${data.summary ?? data.severity ?? ''}`
    case 'newsletter':
      return `Your TravelManager weekly digest — week of ${data.weekOf}`
    default:
      return `Notification: ${template}`
  }
}

function renderHtml(template, data, branding = {}) {
  const headerColor = branding.primaryColor || '#0f172a'
  const accent = branding.accentColor || '#0ea5e9'
  const logoTag = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="logo" style="max-height:48px;margin-bottom:16px"/>`
    : ''
  let body = ''
  switch (template) {
    case 'travel_warning':
      body = `
        <h2 style="color:${headerColor}">Travel warning for ${escapeHtml(data.country ?? '')}</h2>
        <p><strong>Severity:</strong> ${escapeHtml(data.severity ?? '')}</p>
        <p>${escapeHtml(data.summary ?? '')}</p>
        <p>Source: ${escapeHtml(data.source ?? '')}</p>`
      break
    case 'newsletter':
      body = `
        <h2 style="color:${headerColor}">Weekly TravelManager digest</h2>
        <p>Week of ${escapeHtml(data.weekOf ?? '')}.</p>
        <pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(data.summary ?? {}, null, 2))}</pre>`
      break
    default:
      body = `<pre>${escapeHtml(JSON.stringify(data ?? {}, null, 2))}</pre>`
  }
  return `<!doctype html><html><body style="font-family:system-ui">${logoTag}${body}<hr style="border-color:${accent}"/></body></html>`
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
