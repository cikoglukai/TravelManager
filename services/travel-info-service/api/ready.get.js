import { readiness } from '../utils/ready.js'

// Readiness probe. Returns 503 until the DB schema is bootstrapped so the
// readinessProbe keeps traffic (and CronJob task POSTs) off the pod until its
// tables exist. Liveness (/api/health) stays 200 — the process is alive even
// while the schema is still being created, so the pod must not be restarted for
// a DB blip.
export default defineEventHandler((event) => {
  if (!readiness.dbReady) {
    setResponseStatus(event, 503)
    return { status: 'starting', service: 'travel-info-service', dbReady: false }
  }
  return { status: 'ok', service: 'travel-info-service', dbReady: true }
})
