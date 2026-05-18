import { publish } from '@travelmanager/shared-events'

// Fire-and-log: never block the request thread on Pub/Sub publish.
// Failures land in service log + are surfaced via SLO error-rate metric on outbox publish.
// (For stronger guarantees: Phase 3 enhancement — outbox table polled by a sidecar.)
export function emit(topic, payload, { tenantId } = {}) {
  publish(topic, payload, { tenantId }).catch((err) => {
    console.error(`[trip][events] publish ${topic} failed:`, err)
  })
}
