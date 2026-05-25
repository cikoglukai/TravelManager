// Travel Info DB schema. Caches travel warnings + weather snapshots and logs
// alerts already raised (for dedup + the /api/alerts banner feed).
import { getDb } from '@travelmanager/shared/db'

export async function initTravelInfoDb() {
  const db = getDb()
  await db.query(`
    CREATE TABLE IF NOT EXISTS warnings_cache (
      id            SERIAL      PRIMARY KEY,
      country_code  TEXT        NOT NULL UNIQUE,
      country_name  TEXT        NOT NULL,
      warning       BOOLEAN     NOT NULL DEFAULT FALSE,
      partial       BOOLEAN     NOT NULL DEFAULT FALSE,
      severity      TEXT        NOT NULL DEFAULT 'none',
      title         TEXT        NOT NULL DEFAULT '',
      content_hash  TEXT        NOT NULL DEFAULT '',
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS weather_cache (
      id          SERIAL      PRIMARY KEY,
      city        TEXT        NOT NULL UNIQUE,
      summary     TEXT        NOT NULL DEFAULT '',
      max_temp    NUMERIC,
      min_temp    NUMERIC,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alert_log (
      id           SERIAL      PRIMARY KEY,
      trip_id      INTEGER     NOT NULL,
      user_uid     TEXT        NOT NULL,
      kind         TEXT        NOT NULL DEFAULT 'warning',
      country      TEXT        NOT NULL DEFAULT '',
      severity     TEXT        NOT NULL DEFAULT '',
      title        TEXT        NOT NULL DEFAULT '',
      content_hash TEXT        NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(trip_id, content_hash)
    );

    CREATE INDEX IF NOT EXISTS alert_log_user_idx ON alert_log (user_uid);
  `)
}
