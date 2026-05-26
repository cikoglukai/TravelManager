// Non-blocking schema bootstrap on startup. Retries with backoff so a cold-start
// race with Postgres / the Cloud SQL proxy self-heals instead of leaving tables
// uncreated.
import { bootstrapSchema } from '@travelmanager/shared/schema-bootstrap'
import { initTripDb } from '../utils/schema.js'
import { readiness } from '../utils/ready.js'

export default defineNitroPlugin(() => {
  bootstrapSchema('trip-service', initTripDb, { readiness })
})
