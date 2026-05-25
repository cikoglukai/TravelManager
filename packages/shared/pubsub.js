// Shared Pub/Sub helpers — the async backbone for TravelManager.
//
// Topics: TripCreated, TripUpdated, TravelAlert, NewsletterReady.
// Publishers (Trip, Travel Info, Social) call publishEvent().
// Async workers (Social, Travel Info, Notification) call createSubscriber(),
// which exposes control state (pause/resume, counters, last-message time) so
// each worker can surface a control endpoint for the workflows.
//
// Local dev: set PUBSUB_DISABLED=1 to make publishing a logged no-op, or point
// PUBSUB_EMULATOR_HOST at the Pub/Sub emulator.
import { PubSub } from '@google-cloud/pubsub'

let _client = null

export function getPubSub() {
  if (_client) return _client
  _client = new PubSub({
    projectId:
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  return _client
}

const disabled = () => process.env.PUBSUB_DISABLED === '1'

// Publish a JSON event. Attributes are indexed by Pub/Sub for filtering.
export async function publishEvent(topicName, payload, attributes = {}) {
  if (disabled()) {
    console.log(`[pubsub] (disabled) would publish ${topicName}`, payload)
    return 'disabled'
  }
  const data = Buffer.from(JSON.stringify(payload))
  const messageId = await getPubSub()
    .topic(topicName)
    .publishMessage({ data, attributes })
  return messageId
}

// Subscribe to a subscription with a message handler. Returns a controller with
// pause()/resume()/stats()/close() — the basis for each worker's control API.
// The handler receives the parsed JSON payload and the raw message. Throwing (or
// rejecting) nacks the message so Pub/Sub redelivers; a dead-letter policy on the
// subscription (configured in Terraform) caps redelivery attempts.
export function createSubscriber(subscriptionName, handler, opts = {}) {
  const sub = getPubSub().subscription(subscriptionName, {
    flowControl: { maxMessages: opts.maxMessages ?? 20 },
  })

  const stats = {
    subscription: subscriptionName,
    processed: 0,
    failed: 0,
    lastMessageAt: null,
    paused: false,
  }

  const onMessage = async (message) => {
    if (stats.paused) {
      message.nack()
      return
    }
    stats.lastMessageAt = new Date().toISOString()

    // Parse failure is permanent — ack (drop) so it doesn't redeliver forever.
    let payload
    try {
      payload = JSON.parse(message.data.toString())
    } catch (err) {
      stats.failed++
      console.error(`[pubsub] ${subscriptionName} dropping unparseable message`, err)
      message.ack()
      return
    }

    // Handler failure may be transient — nack so Pub/Sub retries (capped by the
    // subscription's dead-letter policy).
    try {
      await handler(payload, message)
      message.ack()
      stats.processed++
    } catch (err) {
      stats.failed++
      console.error(`[pubsub] ${subscriptionName} handler error`, err)
      message.nack()
    }
  }

  sub.on('message', onMessage)
  sub.on('error', (err) => console.error(`[pubsub] ${subscriptionName} error`, err))

  return {
    pause() { stats.paused = true; return stats },
    resume() { stats.paused = false; return stats },
    stats() { return { ...stats } },
    async close() { await sub.close() },
  }
}
