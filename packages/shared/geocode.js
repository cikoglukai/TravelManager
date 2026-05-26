// Server-side geocoder. Turns a place string into { lat, lng, formatted }.
//
// Prefers the Google Geocoding REST API (GOOGLE_MAPS_SERVER_KEY) for accuracy;
// falls back to the keyless Open-Meteo geocoding API when no key is set so
// local dev works without a billed key. In-memory cache (incl. null-on-miss)
// mirrors the resolver pattern in trip-service/utils/rapidapi.js — unbounded,
// cleared on restart.

const CACHE = new Map()

// Take the first place when a destination is a list ("Vienna & Salzburg").
function primaryPlace(raw) {
  if (!raw) return ''
  return String(raw)
    .split(/\s*(?:&|,|\/|\sund\s|\sand\s)\s*/i)[0]
    .trim()
}

async function viaGoogle(query, key) {
  const res = await $fetch('https://maps.googleapis.com/maps/api/geocode/json', {
    query: { address: query, key },
  })
  if (res?.status !== 'OK') return null
  const hit = res.results?.[0]
  const loc = hit?.geometry?.location
  if (!loc) return null
  const country = hit.address_components
    ?.find(c => c.types?.includes('country'))?.long_name || null
  return { lat: loc.lat, lng: loc.lng, formatted: hit.formatted_address || query, country }
}

async function viaOpenMeteo(query) {
  const res = await $fetch('https://geocoding-api.open-meteo.com/v1/search', {
    query: { name: query, count: 1 },
  })
  const place = res?.results?.[0]
  if (!place) return null
  return {
    lat: place.latitude,
    lng: place.longitude,
    formatted: [place.name, place.country].filter(Boolean).join(', '),
    country: place.country || null,
  }
}

// Returns { lat, lng, formatted } or null. Never throws — geocoding is
// best-effort enrichment and must not fail the write path that calls it.
export async function geocodeCity(query) {
  const q = primaryPlace(query)
  if (!q) return null

  const cacheKey = q.toLowerCase()
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey)

  const key = process.env.GOOGLE_MAPS_SERVER_KEY || ''
  let result = null
  try {
    result = key ? await viaGoogle(q, key) : await viaOpenMeteo(q)
    // If Google returns nothing usable, still try the keyless fallback.
    if (!result && key) result = await viaOpenMeteo(q)
  } catch (err) {
    console.error('[geocode] lookup failed for', q, err?.message || err)
    result = null
  }

  CACHE.set(cacheKey, result)
  return result
}
