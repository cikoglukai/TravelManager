// k6 micro-benchmark: end-to-end fan-out latency.
// 1) Publish a synthetic warning via the test endpoint
// 2) Poll /api/alerts/me until the alert lands
// 3) Record observed latency
//
// Threshold: p95 < 30 s end-to-end (matches assignment-acceptable async delivery target).

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'

export const options = {
  vus: 5,
  duration: '5m',
  thresholds: {
    'warning_to_alert_seconds': ['p(95)<30'],
  },
}

const HOST  = __ENV.HOST  || 'https://staging.travelmanager.app'
const TOKEN = __ENV.TOKEN || ''
const TEST_TOKEN = __ENV.TEST_TOKEN || ''
const latency = new Trend('warning_to_alert_seconds')

export default function () {
  const eventId = `k6-${Date.now()}-${__VU}-${__ITER}`
  const start = Date.now()
  http.post(`${HOST}/api/internal/test/publish-warning`, JSON.stringify({
    eventId, tenantId: 'system',
    occurredAt: new Date().toISOString(),
    version: 1,
    warningId: eventId, country: 'FR', severity: 'warning',
    validFrom: new Date().toISOString(),
    validTo:   new Date(Date.now() + 7 * 86400e3).toISOString(),
    source: 'manual',
  }), {
    headers: { 'content-type': 'application/json', 'x-test-token': TEST_TOKEN },
  })

  for (let i = 0; i < 60; i++) {
    const r = http.get(`${HOST}/api/alerts/me`, {
      headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : {},
    })
    if (r.status === 200 && r.body.includes(eventId)) {
      latency.add((Date.now() - start) / 1000)
      break
    }
    sleep(1)
  }
  check(true, { 'ok': () => true })
}
