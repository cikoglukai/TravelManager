// Redis-backed cache for RapidAPI lookups. Replaces the in-memory Map in monolith server/utils/rapidapi.js.
// Memorystore Redis instance reachable via REDIS_URL env. Falls back to in-memory if REDIS_URL absent (dev).

import Redis from 'ioredis'

let _client = null
const _memory = new Map()

function getRedis() {
  if (_client) return _client
  const url = process.env.REDIS_URL
  if (!url) return null
  _client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 })
  _client.on('error', (e) => console.error('[booking][redis] error:', e.message))
  return _client
}

export async function cacheGet(key) {
  const r = getRedis()
  if (!r) {
    const hit = _memory.get(key)
    if (!hit) return null
    if (hit.expiresAt < Date.now()) { _memory.delete(key); return null }
    return hit.value
  }
  const raw = await r.get(key)
  return raw ? JSON.parse(raw) : null
}

export async function cacheSet(key, value, ttlSeconds = 60 * 60 * 24) {
  const r = getRedis()
  if (!r) {
    _memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    return
  }
  await r.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}
