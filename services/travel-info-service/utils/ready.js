// Process-wide readiness state. The schema bootstrap plugin flips dbReady once
// the DB schema is in place; the health endpoint reports NotReady until then so
// the readinessProbe keeps traffic (and CronJob POSTs) off the pod until its
// tables exist. Prevents the cold-start race where a poll task INSERTs into a
// table that hasn't been created yet.
export const readiness = { dbReady: false }
