// Boot-time idempotent schema bootstrap. Mirrors monolith server/utils/db.js initDb().
// Replaces the node-pg-migrate flow for local/dev — production uses the migration Job in Helm.

import { defineNitroPlugin } from 'nitropack/runtime'
import { getPool } from '@travelmanager/shared-db'

export default defineNitroPlugin(async () => {
  if (process.env.SKIP_DB_INIT === '1') return
  const p = getPool('trip', 'system', 'standard')
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        firebase_uid TEXT PRIMARY KEY,
        email        TEXT NOT NULL UNIQUE,
        name         TEXT NOT NULL,
        bio          TEXT NOT NULL DEFAULT '',
        home_city    TEXT NOT NULL DEFAULT '',
        avatar_url   TEXT NOT NULL DEFAULT '',
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS trips (
        id                 SERIAL PRIMARY KEY,
        user_uid           TEXT NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
        title              TEXT NOT NULL,
        destination        TEXT NOT NULL,
        origin             TEXT NOT NULL DEFAULT '',
        start_date         DATE NOT NULL,
        end_date           DATE,
        short_description  TEXT NOT NULL,
        detail_description TEXT NOT NULL DEFAULT '',
        created_at         TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS trips_user_uid_idx   ON trips(user_uid);
      CREATE INDEX IF NOT EXISTS trips_start_date_idx ON trips(start_date);

      CREATE TABLE IF NOT EXISTS plan_locations (
        id          SERIAL PRIMARY KEY,
        trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image_url   TEXT NOT NULL DEFAULT '',
        date_from   DATE,
        date_to     DATE,
        position    INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS plan_locations_trip_id_idx ON plan_locations(trip_id);
    `)
    console.log('[trip] db schema ready')
  } catch (e) {
    console.error('[trip] db init failed:', e.message)
  }
})
