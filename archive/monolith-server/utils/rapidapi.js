// Shared helpers for the RapidAPI integrations (Skyscanner + Booking.com).
//
// Both APIs require an opaque ID before the user-facing search endpoint can be
// called (Skyscanner: skyId + entityId; Booking: dest_id + dest_type), so we
// expose memoized resolvers that turn a plain city string into those IDs.
//
// Cache is in-memory and unbounded; restart clears it. Acceptable for the
// handful of distinct cities seen in this app.

const SKY_CACHE = new Map()
const BOOKING_CACHE = new Map()

// Seed destinations look like "Vienna & Salzburg", "Rome, Florence & Venice".
// Strip the region suffix and keep the first primary city so the upstream
// autocomplete endpoints can resolve a real airport / dest_id.
function primaryCity(raw) {
  if (!raw) return ''
  return String(raw)
    .split(/\s*(?:&|,|\/|\sund\s|\sand\s)\s*/i)[0]
    .trim()
}

function getKey() {
  // Read on every call so env reloads during dev are respected.
  return useRuntimeConfig().rapidApiKey
}

async function rapidFetch(url, host, query) {
  const key = getKey()
  if (!key) return null
  try {
    return await $fetch(url, {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host },
      query,
    })
  } catch (err) {
    console.error(`[rapidapi] ${host} call failed:`, err?.message || err)
    return null
  }
}

export async function resolveSkyscannerEntity(query) {
  const q = primaryCity(query)
  if (!q) return null
  const cacheKey = q.toLowerCase()
  if (SKY_CACHE.has(cacheKey)) return SKY_CACHE.get(cacheKey)

  const res = await rapidFetch(
    'https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport',
    'sky-scrapper.p.rapidapi.com',
    { query: q, locale: 'en-US' }
  )
  console.log(`[rapidapi] searchAirport(${q}) →`, JSON.stringify(res?.data?.slice?.(0, 2)))

  const hit = res?.data?.[0]
  if (!hit) {
    SKY_CACHE.set(cacheKey, null)
    return null
  }

  // For city queries Sky Scrapper sometimes returns a PLACE entry with no
  // airport-level skyId at the top of the list. Prefer the first AIRPORT entry
  // when one is present so the search endpoint actually has IATA-level inputs.
  const airportHit = res.data.find(d =>
    (d.navigation?.entityType || '').toUpperCase() === 'AIRPORT'
  )
  const chosen = airportHit || hit

  const result = {
    skyId:    chosen.skyId    || chosen.presentation?.skyId,
    entityId: chosen.entityId || chosen.navigation?.entityId,
  }
  if (!result.skyId || !result.entityId) {
    SKY_CACHE.set(cacheKey, null)
    return null
  }

  SKY_CACHE.set(cacheKey, result)
  return result
}

export async function resolveBookingLocation(city) {
  const c = primaryCity(city)
  if (!c) return null
  const cacheKey = c.toLowerCase()
  if (BOOKING_CACHE.has(cacheKey)) return BOOKING_CACHE.get(cacheKey)

  const res = await rapidFetch(
    'https://booking-com.p.rapidapi.com/v1/hotels/locations',
    'booking-com.p.rapidapi.com',
    { name: c, locale: 'en-gb' }
  )

  // Prefer a city-type hit, then fall back to whatever the first hit is.
  const list = Array.isArray(res) ? res : []
  const hit = list.find(h => h.dest_type === 'city') || list[0]
  if (!hit) {
    BOOKING_CACHE.set(cacheKey, null)
    return null
  }

  const result = { dest_id: hit.dest_id, dest_type: hit.dest_type || 'city' }
  if (!result.dest_id) {
    BOOKING_CACHE.set(cacheKey, null)
    return null
  }

  BOOKING_CACHE.set(cacheKey, result)
  return result
}
