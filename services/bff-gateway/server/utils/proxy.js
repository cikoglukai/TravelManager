// Generic upstream proxy with tenant + auth header forwarding.
// Each route module calls proxy(event, baseUrl) — baseUrl from a per-service env var.

export async function proxy(event, baseUrl) {
  const url = new URL(event.path, baseUrl)
  const headers = new Headers()

  // Forward auth + tenant context.
  const auth = event.node?.req?.headers?.['authorization']
  if (auth) headers.set('authorization', auth)
  headers.set('host', event.node?.req?.headers?.host ?? '')
  headers.set('x-tenant-id', event.context.tenant?.tenantId ?? 'public')
  headers.set('x-tenant-plan', event.context.tenant?.plan ?? 'free')
  if (event.context.user?.uid) headers.set('x-user-uid', event.context.user.uid)

  const init = { method: event.method, headers }
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    const buf = await readRawBody(event)
    if (buf) init.body = buf
  }

  const upstream = await fetch(url, init)
  setResponseStatus(event, upstream.status)
  upstream.headers.forEach((v, k) => {
    if (k === 'transfer-encoding' || k === 'content-encoding') return
    setResponseHeader(event, k, v)
  })
  const text = await upstream.text()
  return text
}

// Lazy-import so the file loads cleanly under Vitest mocks.
import { readRawBody, setResponseHeader, setResponseStatus } from 'h3'
