// Notification delivery. Resolves the recipient's email from the User service,
// then sends via the SendGrid REST API ($fetch — no SDK dependency). If no
// SENDGRID_API_KEY is configured the email is logged instead (dev / CI safe).
import { getDb } from '@travelmanager/shared/db'
import { control } from './control.js'

async function resolveEmail(userUid) {
  // Runtime env read (useRuntimeConfig bakes defaults at build time).
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001'
  try {
    const u = await $fetch(`/api/users/${userUid}`, { baseURL: userServiceUrl })
    return u?.email || null
  } catch {
    return null
  }
}

async function sendEmail(to, subject, text) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY || ''
  const fromEmail = process.env.FROM_EMAIL || 'alerts@travelmanager.app'
  if (!sendgridApiKey) {
    console.log(`[notify] (no SendGrid key) would email ${to}: ${subject}`)
    return false
  }
  await $fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sendgridApiKey}` },
    body: {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: 'text/plain', value: text }],
    },
  })
  return true
}

async function logNotification(userUid, kind, subject, delivered) {
  const db = getDb()
  await db.query(
    'INSERT INTO notification_log (user_uid, kind, subject, delivered) VALUES ($1,$2,$3,$4)',
    [userUid, kind, subject, delivered]
  ).catch((e) => console.error('[notify] log failed', e))
}

export async function handleTravelAlert(payload) {
  control.alert.processed++
  control.alert.lastMessageAt = new Date().toISOString()
  const email = await resolveEmail(payload.userUid)
  const subject = `Travel alert for ${payload.country}: ${payload.severity}`
  const text = `Heads up — there is an active travel ${payload.severity} for ${payload.country}, ` +
    `which affects your trip "${payload.tripTitle}". Details: ${payload.title}.`
  let delivered = false
  if (email) {
    try { delivered = await sendEmail(email, subject, text) }
    catch (e) { control.alert.errors++; console.error('[notify] alert email failed', e) }
  }
  if (delivered) control.alert.sent++
  await logNotification(payload.userUid, 'alert', subject, delivered)
}

export async function handleNewsletter(payload) {
  control.newsletter.processed++
  control.newsletter.lastMessageAt = new Date().toISOString()
  const email = await resolveEmail(payload.userUid)
  const subject = `Your weekly travel feed — ${payload.entryCount} new updates`
  const lines = (payload.highlights || []).map(h => `• ${h.title} (${h.destination}) by ${h.author}`)
  const text = `Here's what travellers you follow have been planning:\n\n${lines.join('\n')}`
  let delivered = false
  if (email) {
    try { delivered = await sendEmail(email, subject, text) }
    catch (e) { control.newsletter.errors++; console.error('[notify] newsletter email failed', e) }
  }
  if (delivered) control.newsletter.sent++
  await logNotification(payload.userUid, 'newsletter', subject, delivered)
}
