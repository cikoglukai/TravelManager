// In-memory token-bucket rate limiter, keyed PER CALLER (uid) so users never
// share a bucket — the plan only sets the per-user rate. Good enough for a
// single gateway replica; a multi-replica deployment would back this with Redis
// (otherwise the effective limit is replica-count × rate). The bucket map is
// capacity-bounded to avoid unbounded growth from high-cardinality keys.
const buckets = new Map()
const MAX_BUCKETS = 50_000

export function allow(key, ratePerMin) {
  const now = Date.now()
  const capacity = ratePerMin
  const refillPerMs = ratePerMin / 60000

  let b = buckets.get(key)
  if (!b) {
    // Evict oldest entries if the map grows too large (rough LRU: insertion order).
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value
      buckets.delete(oldest)
    }
    b = { tokens: capacity, last: now }
    buckets.set(key, b)
  }

  // Refill since last check.
  b.tokens = Math.min(capacity, b.tokens + (now - b.last) * refillPerMs)
  b.last = now

  if (b.tokens < 1) return false
  b.tokens -= 1
  return true
}
