import { defineNitroPlugin } from 'nitropack/runtime'
import { getPool } from '@travelmanager/shared-db'

export default defineNitroPlugin(async () => {
  if (process.env.SKIP_DB_INIT === '1') return
  const p = getPool('travel_info', 'system', 'standard')
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS travel_warnings (
        id           SERIAL PRIMARY KEY,
        source       TEXT NOT NULL,
        source_id    TEXT NOT NULL,
        country_iso2 TEXT NOT NULL,
        region       TEXT NOT NULL DEFAULT '',
        severity     TEXT NOT NULL,
        summary      TEXT NOT NULL DEFAULT '',
        valid_from   TIMESTAMPTZ NOT NULL,
        valid_to     TIMESTAMPTZ NOT NULL,
        raw_json     JSONB NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (source, source_id)
      );
      CREATE INDEX IF NOT EXISTS warnings_country_valid_idx ON travel_warnings (country_iso2, valid_to);

      CREATE TABLE IF NOT EXISTS weather_snapshots (
        id            SERIAL PRIMARY KEY,
        city          TEXT NOT NULL,
        country_iso2  TEXT NOT NULL,
        snapshot_at   TIMESTAMPTZ NOT NULL,
        forecast_json JSONB NOT NULL DEFAULT '[]',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS weather_city_idx ON weather_snapshots (city, country_iso2, snapshot_at DESC);

      CREATE TABLE IF NOT EXISTS alert_log (
        id          SERIAL PRIMARY KEY,
        user_uid    TEXT NOT NULL,
        tenant_id   TEXT NOT NULL,
        trip_id     INTEGER NOT NULL,
        warning_id  TEXT NOT NULL,
        kind        TEXT NOT NULL,
        sent_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_uid, trip_id, warning_id)
      );
      CREATE INDEX IF NOT EXISTS alert_user_idx ON alert_log (user_uid);

      -- Denormalized active trips populated by trip.* consumers (matching cache).
      CREATE TABLE IF NOT EXISTS active_trips (
        trip_id      INTEGER PRIMARY KEY,
        user_uid     TEXT NOT NULL,
        tenant_id    TEXT NOT NULL,
        country_iso2 TEXT,
        start_date   DATE NOT NULL,
        end_date     DATE NOT NULL
      );
      CREATE INDEX IF NOT EXISTS active_trips_country_dates_idx ON active_trips (country_iso2, start_date, end_date);
    `)
    console.log('[travel-info] db schema ready')
  } catch (e) {
    console.error('[travel-info] db init failed:', e.message)
  }
})
