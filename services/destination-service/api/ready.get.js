import { readiness } from '../utils/ready.js'

// Readiness probe. Returns 503 until the DB schema + seed is in place so the
// readinessProbe keeps traffic off the pod until its tables exist. Liveness
// (/api/health) stays 200 — the process is alive even while the schema is still
// being created, so the pod must not be restarted for a DB blip.
export default defineEventHandler((event) => {
  if (!readiness.dbReady) {
    setResponseStatus(event, 503)
    return { status: 'starting', service: 'destination-service', dbReady: false }
  }
  return { status: 'ok', service: 'destination-service', dbReady: true }
})
