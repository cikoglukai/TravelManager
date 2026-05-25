// Hand-rolled reverse proxy. h3's proxyRequest threw 502 in this runtime even
// for clean in-cluster GETs, so we forward explicitly: copy a curated header
// set, drop hop-by-hop + accept-encoding (avoid compressed-body handling), add
// the gateway's identity headers, and stream the upstream response back.
const STRIP = new Set([
  'host', 'connection', 'content-length', 'transfer-encoding',
  'accept-encoding', 'keep-alive', 'upgrade',
])

export async function proxyTo(event, url, extraHeaders = {}) {
  const method = event.method
  const inHeaders = getRequestHeaders(event)

  const headers = {}
  for (const [k, v] of Object.entries(inHeaders)) {
    if (v == null || STRIP.has(k.toLowerCase())) continue
    headers[k] = v
  }
  Object.assign(headers, extraHeaders)

  let body
  if (method !== 'GET' && method !== 'HEAD') {
    body = await readRawBody(event, false) // Buffer (or undefined)
  }

  let res
  try {
    res = await fetch(url, { method, headers, body, redirect: 'manual' })
  } catch (err) {
    console.error(`[gateway] proxy ${method} ${url} failed`, err)
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
  }

  setResponseStatus(event, res.status)
  const ct = res.headers.get('content-type')
  if (ct) setResponseHeader(event, 'content-type', ct)
  return Buffer.from(await res.arrayBuffer())
}
