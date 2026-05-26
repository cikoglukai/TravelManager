// Bootstrap the schema with bounded retries via the shared helper. Postgres (or
// the Cloud SQL proxy sidecar) may not accept connections the instant this pod
// starts, so a single attempt can fail spuriously. Retry with backoff and flip
// readiness only once the schema is in place — the readinessProbe keeps the pod
// NotReady until then, so no CronJob POST hits the pod before its tables exist.
import { bootstrapSchema } from '@travelmanager/shared/schema-bootstrap'
import { initTravelInfoDb } from '../utils/schema.js'
import { readiness } from '../utils/ready.js'

export default defineNitroPlugin(() => {
  bootstrapSchema('travel-info-service', initTravelInfoDb, { readiness })
})
