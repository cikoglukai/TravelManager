// Non-blocking schema bootstrap + seed on startup. Retries with backoff so a
// cold-start race with Postgres / the Cloud SQL proxy self-heals instead of
// leaving tables uncreated.
import { bootstrapSchema } from '@travelmanager/shared/schema-bootstrap'
import { initDestinationDb } from '../utils/schema.js'
import { seedDb } from '../utils/seed.js'
import { readiness } from '../utils/ready.js'

export default defineNitroPlugin(() => {
  bootstrapSchema('destination-service', async () => {
    await initDestinationDb()
    await seedDb()
  }, { readiness })
})
