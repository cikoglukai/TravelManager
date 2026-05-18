// Pub/Sub push handler for travel-info.ingest.tick — switches on payload.source and runs the right ingester.

import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler, publish } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { fetchGdacs } from '../../../../lib/sources/gdacs.js'
import { fetchReliefweb } from '../../../../lib/sources/reliefweb.js'
import { fetchWeatherForCity } from '../../../../lib/sources/openweather.js'
import { pool } from '../../../../utils/db.js'
import { randomUUID } from 'node:crypto'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

async function ingestWarnings(items) {
  let inserted = 0
  let updated = 0
  for (const w of items) {
    const r = await pool().query(
      `INSERT INTO travel_warnings (source, source_id, country_iso2, region, severity, summary, valid_from, valid_to, raw_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (source, source_id) DO UPDATE
         SET severity = EXCLUDED.severity,
             summary  = EXCLUDED.summary,
             valid_to = EXCLUDED.valid_to,
             raw_json = EXCLUDED.raw_json
       RETURNING id, (xmax = 0) AS was_inserted`,
      [w.source, w.source_id, w.country_iso2, w.region, w.severity, w.summary, w.valid_from, w.valid_to, w.raw_json]
    )
    const row = r.rows[0]
    if (row.was_inserted) inserted++
    else updated++
    await publish('travel.warning.published', {
      warningId:  String(row.id),
      country:    w.country_iso2,
      region:     w.region,
      severity:   w.severity,
      validFrom:  w.valid_from,
      validTo:    w.valid_to,
      source:     w.source,
      summary:    w.summary,
    }, { tenantId: 'system' })
  }
  return { inserted, updated }
}

export default defineEventHandler(subscribeHandler('travel-info.ingest.tick',
  async (_event, payload) => {
    const source = payload.source
    if (source === 'gdacs')      return ingestWarnings(await fetchGdacs())
    if (source === 'reliefweb')  return ingestWarnings(await fetchReliefweb())
    if (source === 'openweather') {
      // Weather is per-city; pull active trip cities.
      // For v1, run a sample on Paris/Tokyo/NY — proper implementation joins active trips per tenant.
      const cities = [
        { city: 'Paris', country: 'FR' },
        { city: 'Tokyo', country: 'JP' },
        { city: 'New York', country: 'US' },
      ]
      let count = 0
      for (const c of cities) {
        const snap = await fetchWeatherForCity(c)
        if (!snap) continue
        await pool().query(
          `INSERT INTO weather_snapshots (city, country_iso2, snapshot_at, forecast_json)
           VALUES ($1,$2,$3,$4)`,
          [snap.city, snap.country, snap.snapshotAt, JSON.stringify(snap.forecast)]
        )
        await publish('travel.weather.snapshot', {
          city: snap.city, country: snap.country, snapshotAt: snap.snapshotAt, forecast: snap.forecast,
        }, { tenantId: 'system' })
        count++
      }
      return { weatherSnapshots: count }
    }
    throw createError({ statusCode: 400, statusMessage: `Unknown source: ${source}` })
  },
  { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
))
