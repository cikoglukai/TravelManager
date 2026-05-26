// Non-blocking schema bootstrap on startup (Cloud Run / GKE need a fast listen).
// Retries with backoff so a cold-start race with Postgres / the Cloud SQL proxy
// self-heals instead of leaving the `users` table uncreated.
import { bootstrapSchema } from '@travelmanager/shared/schema-bootstrap'
import { initUserDb } from '../utils/schema.js'
import { readiness } from '../utils/ready.js'

export default defineNitroPlugin(() => {
  bootstrapSchema('user-service', initUserDb, { readiness })
})
