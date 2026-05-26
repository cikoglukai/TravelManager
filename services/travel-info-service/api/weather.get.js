// GET /api/weather — cached daily weather for the cities of the authenticated
// user's upcoming trips. Read side of the pollWeather worker (weather_cache).
// Value-add only; never raises alerts.
import { getDb } from '@travelmanager/shared/db'

// Mirror the poller's city derivation so lookups hit the same cache keys:
// take the destination up to the first separator and trim.
function cityOf(destination) {
  return String(destination || '').split(/[&,]/)[0].trim()
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripServiceUrl = process.env.TRIP_SERVICE_URL || 'http://localhost:3002'
  const trips = await $fetch('/api/internal/active-trips', { baseURL: tripServiceUrl })
    .catch((e) => { console.error('[travel-info] active-trips fetch failed', e?.message || e); return [] })

  // City -> the user's trips heading there, so the client can label each card.
  const tripsByCity = new Map()
  for (const t of trips) {
    if (t.user_uid !== user.uid) continue
    const city = cityOf(t.destination)
    if (!city) continue
    if (!tripsByCity.has(city)) tripsByCity.set(city, [])
    tripsByCity.get(city).push({ tripId: t.trip_id, title: t.title, startDate: t.start_date })
  }
  const cities = [...tripsByCity.keys()]
  if (!cities.length) return []

  const db = getDb()
  const { rows } = await db.query(
    `SELECT city, summary, max_temp, min_temp, updated_at
     FROM weather_cache
     WHERE city = ANY($1)`,
    [cities]
  )

  return rows.map(r => ({ ...r, trips: tripsByCity.get(r.city) || [] }))
})
