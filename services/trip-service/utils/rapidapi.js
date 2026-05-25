// RapidAPI helpers (Skyscanner + Booking.com). Auto-imported by Nitro.
//
// Both APIs require an opaque ID before the user-facing search endpoint can be
// called (Skyscanner: skyId + entityId; Booking: dest_id + dest_type), so we
// expose memoized resolvers that turn a plain city string into those IDs.
// Cache is in-memory and unbounded; restart clears it.

const SKY_CACHE = new Map()
const BOOKING_CACHE = new Map()

function primaryCity(raw) {
  if (!raw) return ''
  return String(raw)
    .split(/\s*(?:&|,|\/|\sund\s|\sand\s)\s*/i)[0]
    .trim()
}

function getKey() {
  return process.env.RAPIDAPI_KEY || ''
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

  const hit = res?.data?.[0]
  if (!hit) {
    SKY_CACHE.set(cacheKey, null)
    return null
  }

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
