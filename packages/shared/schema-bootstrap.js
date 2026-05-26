// Bounded-retry schema bootstrap shared by all DB-backed services. Postgres (or
// the Cloud SQL Auth Proxy sidecar) may not accept connections the instant a
// pod starts, so a single init attempt fails spuriously on cold start. Retrying
// with backoff makes the bootstrap self-heal once the DB is reachable, instead
// of leaving the pod permanently serving 500s on missing tables.
//
// `readiness.dbReady` is flipped true only after the schema is in place; the
// service's readinessProbe (health endpoint) gates on it so Kubernetes keeps
// traffic — and CronJob/subscriber work — off the pod until its tables exist.

export function createReadiness() {
  return { dbReady: false }
}

export async function bootstrapSchema(label, initFn, { readiness, maxAttempts = 30 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await initFn()
      if (readiness) readiness.dbReady = true
      console.log(`[${label}] schema ready`)
      return true
    } catch (err) {
      const delay = Math.min(1000 * attempt, 10000)
      console.error(
        `[${label}] schema bootstrap attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
        err?.message || err
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  // Exhausted retries: leave dbReady=false so the pod never goes Ready and the
  // deployment surfaces the failure instead of silently serving 500s.
  console.error(`[${label}] schema bootstrap exhausted retries; pod stays NotReady`)
  return false
}
