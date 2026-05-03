import pg from 'pg'

const { Pool } = pg

let _pool = null

export function getDb() {
  if (_pool) return _pool

  _pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5433/travelmanager',
  })

  return _pool
}

export async function initDb() {
  const pool = getDb()

  // Idempotent schema bootstrap. Tables persist across container restarts
  // (postgres_data volume). DROP only when SCHEMA_RESET=1 (destructive — wipes
  // all user data).
  if (process.env.SCHEMA_RESET === '1') {
    await pool.query(`
      DROP TABLE IF EXISTS travel_plans    CASCADE;
      DROP TABLE IF EXISTS reviews         CASCADE;
      DROP TABLE IF EXISTS plan_locations  CASCADE;
      DROP TABLE IF EXISTS trips           CASCADE;
      DROP TABLE IF EXISTS users           CASCADE;
    `)
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      firebase_uid TEXT        PRIMARY KEY,
      email        TEXT        NOT NULL UNIQUE,
      name         TEXT        NOT NULL,
      bio          TEXT        NOT NULL DEFAULT '',
      home_city    TEXT        NOT NULL DEFAULT '',
      avatar_url   TEXT        NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trips (
      id                  SERIAL      PRIMARY KEY,
      user_uid            TEXT        NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
      title               TEXT        NOT NULL,
      destination         TEXT        NOT NULL,
      start_date          TEXT        NOT NULL,
      short_description   TEXT        NOT NULL,
      detail_description  TEXT        NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plan_locations (
      id          SERIAL      PRIMARY KEY,
      trip_id     INTEGER     NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      name        TEXT        NOT NULL,
      description TEXT        NOT NULL DEFAULT '',
      image_url   TEXT        NOT NULL DEFAULT '',
      date_from   DATE,
      date_to     DATE,
      position    INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Review comments live in Firestore (collection: reviews/{tripId}/users/{reviewerUid}).
    CREATE TABLE IF NOT EXISTS reviews (
      id          SERIAL      PRIMARY KEY,
      trip_id     INTEGER     NOT NULL REFERENCES trips(id)             ON DELETE CASCADE,
      reviewer_id TEXT        NOT NULL REFERENCES users(firebase_uid)   ON DELETE CASCADE,
      stars       INTEGER     NOT NULL CHECK (stars BETWEEN 1 AND 5),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(trip_id, reviewer_id)
    );

    -- Older deploys created reviews with a NOT NULL comment column. Drop it
    -- if present so existing volumes line up with the Firestore-backed schema.
    ALTER TABLE reviews DROP COLUMN IF EXISTS comment;
  `)

  // Static lookup tables — created only if they do not already exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS destinations (
      id          SERIAL PRIMARY KEY,
      country     TEXT NOT NULL,
      city        TEXT NOT NULL,
      emoji       TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      UNIQUE(country, city)
    );

    CREATE TABLE IF NOT EXISTS routes (
      id             SERIAL  PRIMARY KEY,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      description    TEXT    NOT NULL DEFAULT '',
      duration_days  INTEGER NOT NULL,
      highlights     TEXT    NOT NULL DEFAULT '',
      UNIQUE(destination_id, name)
    );

    CREATE TABLE IF NOT EXISTS transport_options (
      id         SERIAL  PRIMARY KEY,
      route_id   INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL,
      provider   TEXT    NOT NULL DEFAULT '',
      duration   TEXT    NOT NULL DEFAULT '',
      price_from INTEGER NOT NULL DEFAULT 0,
      notes      TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS accommodation_options (
      id              SERIAL    PRIMARY KEY,
      route_id        INTEGER   NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      type            TEXT      NOT NULL,
      name            TEXT      NOT NULL,
      price_per_night INTEGER   NOT NULL DEFAULT 0,
      rating          NUMERIC(2,1) NOT NULL DEFAULT 0,
      notes           TEXT      NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS travel_plans (
      id                      SERIAL  PRIMARY KEY,
      trip_id                 INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
      destination_id          INTEGER REFERENCES destinations(id),
      route_id                INTEGER REFERENCES routes(id),
      transport_option_id     INTEGER REFERENCES transport_options(id),
      accommodation_option_id INTEGER REFERENCES accommodation_options(id),
      notes                   TEXT    NOT NULL DEFAULT '',
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
