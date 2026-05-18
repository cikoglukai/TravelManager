// k6 micro-benchmark: feed read path. Threshold p95 < 300 ms for reads.

import http from 'k6/http'
import { sleep, check } from 'k6'

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<700'],
    http_req_failed:   ['rate<0.01'],
  },
}

const HOST  = __ENV.HOST  || 'https://staging.travelmanager.app'
const TOKEN = __ENV.TOKEN || ''

export default function () {
  const r = http.get(`${HOST}/api/feed`, {
    headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : {},
  })
  check(r, { 'status 200': (res) => res.status === 200 })
  sleep(0.5)
}
