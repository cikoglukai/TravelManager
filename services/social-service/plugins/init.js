// Bootstrap: init schema, then (unless Pub/Sub is disabled) start the pull
// subscribers that drive the feed builder. Subscriptions are provisioned by
// Terraform. In environments using Pub/Sub PUSH instead, POST /api/events/trip
// is the alternative entry point.
import { initSocialDb } from '../utils/schema.js'
import { buildFeedFromTrip } from '../utils/feed.js'
import { control } from '../utils/control.js'

export default defineNitroPlugin(async () => {
  try {
    await initSocialDb()
    console.log('[social-service] schema ready')
  } catch (err) {
    console.error('[social-service] schema bootstrap failed', err)
  }

  if (process.env.PUBSUB_DISABLED === '1') {
    console.log('[social-service] Pub/Sub disabled — subscribers not started')
    return
  }

  const { createSubscriber } = await import('@travelmanager/shared/pubsub')
  const onTrip = async (payload) => { await buildFeedFromTrip(payload) }

  createSubscriber(process.env.TRIP_CREATED_SUB || 'social-trip-created-sub', onTrip)
  createSubscriber(process.env.TRIP_UPDATED_SUB || 'social-trip-updated-sub', onTrip)
  control.feed.subscriberUp = true
  console.log('[social-service] feed subscribers started')
})
