// Create all Pub/Sub topics + DLQs + subscriptions against the local emulator.
// Mirrors terraform/envs/staging/pubsub.tf so local matches staging.

import { PubSub } from '@google-cloud/pubsub'

const TOPICS = {
  'trip.created':                ['trip.created.social-feed-fanout', 'trip.created.travel-info-match', 'trip.created.destination-aggregator'],
  'trip.updated':                ['trip.updated.social-feed-fanout', 'trip.updated.travel-info-match'],
  'trip.deleted':                ['trip.deleted.social-feed-cleanup', 'trip.deleted.travel-info-cleanup'],
  'social.activity':             ['social.activity.feed-fanout'],
  'travel.warning.published':    ['travel.warning.match'],
  'travel.weather.snapshot':     ['travel.weather.match'],
  'notification.requested':      ['notification.dispatch'],
  'notification.delivered':      ['notification.audit'],
  'newsletter.scheduled':        ['newsletter.run'],
  'tenant.plan.changed':         ['tenant.plan.changed.bff-cache', 'tenant.plan.changed.social', 'tenant.plan.changed.destination'],
  'travel-info.ingest.tick':     ['travel-info.ingest'],
  'social.feed.cleanup.tick':    ['social.feed.cleanup'],
  'destination.aggregate.tick':  ['destination.aggregate.tick.run'],
}

const ps = new PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'local-tm' })

async function ensure(topicName) {
  try {
    await ps.createTopic(topicName)
    console.log(`[bootstrap] topic + ${topicName}`)
  } catch (e) {
    if (e.code !== 6) throw e   // 6 = ALREADY_EXISTS
  }
}
async function ensureSub(topic, sub) {
  try {
    await ps.topic(topic).createSubscription(sub, { ackDeadlineSeconds: 60 })
    console.log(`[bootstrap]   sub  + ${sub} (on ${topic})`)
  } catch (e) {
    if (e.code !== 6) throw e
  }
}

for (const [t, subs] of Object.entries(TOPICS)) {
  await ensure(t)
  await ensure(`${t}.dlq`)
  for (const s of subs) await ensureSub(t, s)
  await ensureSub(`${t}.dlq`, `${t}.dlq.drain`)
}

console.log('[bootstrap] done.')
process.exit(0)
