// Travel Info workers: poll official warnings + weather, diff against active
// trips, publish TravelAlert events. Auto-imported by Nitro.
import { createHash } from 'node:crypto'
import { getDb } from '@travelmanager/shared/db'
import { publishEvent } from '@travelmanager/shared/pubsub'
import { control } from './control.js'

function hash(s) {
  return createHash('sha1').update(String(s)).digest('hex').slice(0, 16)
}

// Read config from the environment AT RUNTIME (useRuntimeConfig bakes its
// process.env defaults at build time, so env overrides on the pod are ignored).
function cfgEnv() {
  return {
    tripServiceUrl: process.env.TRIP_SERVICE_URL || 'http://localhost:3002',
    warningsApiUrl: process.env.WARNINGS_API_URL || 'https://www.auswaertiges-amt.de/opendata/travelwarning',
    weatherApiUrl:  process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
  }
}

// --- Warning poller -------------------------------------------------------
// Fetches the Auswärtiges Amt open-data travel-warning feed and upserts the
// per-country warning state into warnings_cache.
export async function pollWarnings() {
  if (control.warnings.paused) return { skipped: 'paused' }
  const started = Date.now()
  const cfg = cfgEnv()
  const db = getDb()

  let upserted = 0
  try {
    const res = await $fetch(cfg.warningsApiUrl)
    const entries = res?.response ?? {}

    for (const [id, w] of Object.entries(entries)) {
      if (!w || typeof w !== 'object' || !w.countryName) continue
      const warning = Boolean(w.warning)
      const partial = Boolean(w.partialWarning || w.situationWarning)
      const severity = warning ? 'warning' : partial ? 'partial' : 'none'
      const title = w.title || w.countryName
      const code = w.iso3CountryCode || w.countryCode || String(id)
      // Include country so two countries sharing severity+title don't collide
      // on the alert_log (trip_id, content_hash) dedup key.
      const ch = hash(`${w.countryName}|${severity}|${title}`)

      await db.query(
        `INSERT INTO warnings_cache (country_code, country_name, warning, partial, severity, title, content_hash, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (country_code) DO UPDATE SET
           country_name=EXCLUDED.country_name, warning=EXCLUDED.warning,
           partial=EXCLUDED.partial, severity=EXCLUDED.severity,
           title=EXCLUDED.title, content_hash=EXCLUDED.content_hash, updated_at=NOW()`,
        [code, w.countryName, warning, partial, severity, title, ch]
      )
      upserted++
    }
    control.warnings.processed = upserted
  } catch (err) {
    control.warnings.errors++
    console.error('[travel-info] pollWarnings failed', err)
    throw err
  } finally {
    control.warnings.lastRun = new Date().toISOString()
    control.warnings.lastDurationMs = Date.now() - started
  }

  const raised = await runDiff()
  control.warnings.alertsRaised += raised
  return { upserted, alertsRaised: raised }
}

// --- Diff engine ----------------------------------------------------------
// Compares active trips (fetched from the Trip service) against cached
// warnings; for each newly-affected trip, logs an alert (dedup by content_hash)
// and publishes a TravelAlert event for the Notification service.
export async function runDiff() {
  const cfg = cfgEnv()
  const db = getDb()

  const trips = await $fetch('/api/internal/active-trips', { baseURL: cfg.tripServiceUrl }).catch(() => [])
  const { rows: warnings } = await db.query(
    `SELECT country_name, severity, title, content_hash FROM warnings_cache WHERE severity <> 'none'`
  )
  if (!trips.length || !warnings.length) return 0

  // Whole-word match on the destination so 'Oman' doesn't match 'Romania' and
  // 'India' doesn't match 'Indianapolis'. Tokens are alpha runs; we test the
  // country name as a standalone token (handles multi-word names too).
  const tokenize = (s) => String(s || '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)
  const matchesCountry = (destTokens, countryName) => {
    const cTokens = tokenize(countryName)
    if (!cTokens.length) return false
    // Every word of the country name must appear as a destination token.
    return cTokens.every(ct => destTokens.includes(ct))
  }

  let raised = 0
  for (const trip of trips) {
    const destTokens = tokenize(trip.destination)
    for (const w of warnings) {
      if (!matchesCountry(destTokens, w.country_name)) continue

      // Dedup insert — UNIQUE(trip_id, content_hash) means a repeat is a no-op.
      const { rowCount } = await db.query(
        `INSERT INTO alert_log (trip_id, user_uid, kind, country, severity, title, content_hash)
         VALUES ($1,$2,'warning',$3,$4,$5,$6)
         ON CONFLICT (trip_id, content_hash) DO NOTHING`,
        [trip.trip_id, trip.user_uid, w.country_name, w.severity, w.title, w.content_hash]
      )
      if (rowCount) {
        raised++
        await publishEvent('TravelAlert', {
          tripId: trip.trip_id,
          userUid: trip.user_uid,
          country: w.country_name,
          severity: w.severity,
          title: w.title,
          tripTitle: trip.title,
        }, { severity: w.severity }).catch((e) => console.error('[travel-info] publish TravelAlert failed', e))
      }
    }
  }
  return raised
}

// --- Weather poller (lower priority) -------------------------------------
// Open-Meteo is keyless. Geocodes destination cities then caches a daily
// summary. Value-add info, no alerts raised.
export async function pollWeather() {
  if (control.weather.paused) return { skipped: 'paused' }
  const started = Date.now()
  const cfg = cfgEnv()
  const db = getDb()

  let updated = 0
  try {
    const trips = await $fetch('/api/internal/active-trips', { baseURL: cfg.tripServiceUrl }).catch(() => [])
    const cities = [...new Set(trips.map(t => String(t.destination || '').split(/[&,]/)[0].trim()).filter(Boolean))].slice(0, 50)

    for (const city of cities) {
      const geo = await $fetch('https://geocoding-api.open-meteo.com/v1/search', {
        query: { name: city, count: 1 },
      }).catch(() => null)
      const place = geo?.results?.[0]
      if (!place) continue

      const fc = await $fetch(cfg.weatherApiUrl, {
        query: { latitude: place.latitude, longitude: place.longitude, daily: 'temperature_2m_max,temperature_2m_min', forecast_days: 1, timezone: 'auto' },
      }).catch(() => null)
      const max = fc?.daily?.temperature_2m_max?.[0]
      const min = fc?.daily?.temperature_2m_min?.[0]
      if (max == null) continue

      await db.query(
        `INSERT INTO weather_cache (city, summary, max_temp, min_temp, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (city) DO UPDATE SET summary=EXCLUDED.summary, max_temp=EXCLUDED.max_temp, min_temp=EXCLUDED.min_temp, updated_at=NOW()`,
        [city, `High ${max}°C / Low ${min}°C`, max, min]
      )
      updated++
    }
    control.weather.processed = updated
  } catch (err) {
    control.weather.errors++
    console.error('[travel-info] pollWeather failed', err)
    throw err
  } finally {
    control.weather.lastRun = new Date().toISOString()
    control.weather.lastDurationMs = Date.now() - started
  }
  return { updated }
}
