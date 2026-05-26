// Bootstrap: init schema (retrying on cold-start DB races), then (unless Pub/Sub
// is disabled) start the pull subscribers that drive the feed builder.
// Subscriptions are provisioned by Terraform. In environments using Pub/Sub PUSH
// instead, POST /api/events/trip is the alternative entry point.
import { bootstrapSchema } from '@travelmanager/shared/schema-bootstrap'
import { initSocialDb } from '../utils/schema.js'
import { buildFeedFromTrip } from '../utils/feed.js'
import { control } from '../utils/control.js'
import { readiness } from '../utils/ready.js'

export default defineNitroPlugin(async () => {
  // Don't start subscribers until the schema exists — they INSERT feed rows.
  const ok = await bootstrapSchema('social-service', initSocialDb, { readiness })
  if (!ok) return

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
