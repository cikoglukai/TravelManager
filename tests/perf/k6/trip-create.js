// k6 service-level micro-benchmark: trip CRUD write path. Run via `k6 run trip-create.js`.
// Thresholds align with SLO: p95 < 800 ms for writes, error rate < 1 %.

import http from 'k6/http'
import { sleep, check } from 'k6'

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed:   ['rate<0.01'],
  },
}

const HOST = __ENV.HOST  || 'https://staging.travelmanager.app'
const TOKEN = __ENV.TOKEN || ''

export default function () {
  const url = `${HOST}/api/trips`
  const body = JSON.stringify({
    title:             `k6-${__VU}-${__ITER}`,
    destination:       'Paris',
    origin:            'Berlin',
    start_date:        '2025-06-01',
    end_date:          '2025-06-08',
    short_description: 'Load test trip',
  })
  const headers = {
    'content-type': 'application/json',
    ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
  }
  const r = http.post(url, body, { headers })
  check(r, { 'status 200': (res) => res.status === 200 })
  sleep(1)
}
