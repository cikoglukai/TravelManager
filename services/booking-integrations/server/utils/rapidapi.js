// Same resolvers as monolith server/utils/rapidapi.js — but cache layer is Redis (cache.js) instead of in-memory Map.

import { cacheGet, cacheSet } from './cache.js'

function primaryCity(raw) {
  if (!raw) return ''
  return String(raw)
    .split(/\s*(?:&|,|\/|\sund\s|\sand\s)\s*/i)[0]
    .trim()
}

async function rapidFetch(url, host, query) {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return null
  try {
    const u = new URL(url)
    Object.entries(query || {}).forEach(([k, v]) => u.searchParams.set(k, v))
    const r = await fetch(u.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host },
    })
    if (!r.ok) {
      console.warn(`[rapidapi] ${host} ${r.status}`)
      return null
    }
    return await r.json()
  } catch (err) {
    console.error(`[rapidapi] ${host} call failed:`, err?.message || err)
    return null
  }
}

export async function resolveSkyscannerEntity(query) {
  const q = primaryCity(query)
  if (!q) return null
  const cacheKey = `sky:${q.toLowerCase()}`
  const cached = await cacheGet(cacheKey)
  if (cached !== null) return cached || null  // null cached as miss-marker

  const res = await rapidFetch(
    'https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport',
    'sky-scrapper.p.rapidapi.com',
    { query: q, locale: 'en-US' }
  )

  const list = res?.data ?? []
  const airport = list.find((d) => (d.navigation?.entityType || '').toUpperCase() === 'AIRPORT')
  const chosen = airport || list[0]
  if (!chosen) {
    await cacheSet(cacheKey, false, 600) // negative cache 10 min
    return null
  }

  const result = {
    skyId:    chosen.skyId    || chosen.presentation?.skyId,
    entityId: chosen.entityId || chosen.navigation?.entityId,
  }
  if (!result.skyId || !result.entityId) {
    await cacheSet(cacheKey, false, 600)
    return null
  }
  await cacheSet(cacheKey, result, 24 * 60 * 60)
  return result
}

export async function resolveBookingLocation(city) {
  const c = primaryCity(city)
  if (!c) return null
  const cacheKey = `booking:${c.toLowerCase()}`
  const cached = await cacheGet(cacheKey)
  if (cached !== null) return cached || null

  const res = await rapidFetch(
    'https://booking-com.p.rapidapi.com/v1/hotels/locations',
    'booking-com.p.rapidapi.com',
    { name: c, locale: 'en-gb' }
  )
  const list = Array.isArray(res) ? res : []
  const hit = list.find((h) => h.dest_type === 'city') || list[0]
  if (!hit?.dest_id) {
    await cacheSet(cacheKey, false, 600)
    return null
  }
  const result = { dest_id: hit.dest_id, dest_type: hit.dest_type || 'city' }
  await cacheSet(cacheKey, result, 24 * 60 * 60)
  return result
}
