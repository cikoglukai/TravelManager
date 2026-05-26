// Bootstrap: init schema (retrying on cold-start DB races), then start pull
// subscribers for TravelAlert + NewsletterReady (unless Pub/Sub disabled). Push
// delivery is also available via /api/events/*.
import { bootstrapSchema } from '@travelmanager/shared/schema-bootstrap'
import { initNotificationDb } from '../utils/schema.js'
import { handleTravelAlert, handleNewsletter } from '../utils/notify.js'
import { control } from '../utils/control.js'
import { readiness } from '../utils/ready.js'

export default defineNitroPlugin(async () => {
  // Don't start subscribers until the schema exists — handlers INSERT rows.
  const ok = await bootstrapSchema('notification-service', initNotificationDb, { readiness })
  if (!ok) return

  if (process.env.PUBSUB_DISABLED === '1') {
    console.log('[notification-service] Pub/Sub disabled — subscribers not started')
    return
  }

  const { createSubscriber } = await import('@travelmanager/shared/pubsub')
  createSubscriber(process.env.TRAVEL_ALERT_SUB || 'notify-travel-alert-sub', handleTravelAlert)
  createSubscriber(process.env.NEWSLETTER_SUB || 'notify-newsletter-sub', handleNewsletter)
  control.alert.subscriberUp = true
  control.newsletter.subscriberUp = true
  console.log('[notification-service] subscribers started')
})
