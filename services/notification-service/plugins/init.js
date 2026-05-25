// Bootstrap: init schema, start pull subscribers for TravelAlert +
// NewsletterReady (unless Pub/Sub disabled). Push delivery is also available via
// /api/events/*.
import { initNotificationDb } from '../utils/schema.js'
import { handleTravelAlert, handleNewsletter } from '../utils/notify.js'
import { control } from '../utils/control.js'

export default defineNitroPlugin(async () => {
  try {
    await initNotificationDb()
    console.log('[notification-service] schema ready')
  } catch (err) {
    console.error('[notification-service] schema bootstrap failed', err)
  }

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
