// Process-wide readiness state. The schema bootstrap flips dbReady once the DB
// schema is in place; the health endpoint reports NotReady until then so the
// readinessProbe keeps traffic (and feed subscribers) off the pod until its
// tables exist.
import { createReadiness } from '@travelmanager/shared/schema-bootstrap'

export const readiness = createReadiness()
