import pg from 'pg'

const { Pool } = pg

// Module-level singleton — one connection pool is shared across all server requests.
// Creating a new pool per request would exhaust database connections quickly.
let _pool = null

/**
 * Returns the shared PostgreSQL connection pool.
 * On first call the pool is created using DATABASE_URL from the environment,
 * falling back to a local development default.
 */
export function getDb() {
  if (_pool) return _pool

  _pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5433/travelmanager',
  })

  return _pool
}

/**
 * Creates the database tables if they do not already exist.
 * Called once at server startup via server/plugins/db.js.
 *
 * Schema:
 *   users  — traveller profiles identified by unique email
 *   trips  — trips owned by a user; cascade-deleted when the user is removed
 */
export async function initDb() {
  const pool = getDb()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,   -- email is the login identifier
      bio        TEXT NOT NULL DEFAULT '',
      home_city  TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trips (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title               TEXT NOT NULL,
      destination         TEXT NOT NULL,
      start_date          TEXT NOT NULL,
      short_description   TEXT NOT NULL,         -- max 80 chars, enforced in API
      detail_description  TEXT NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Migrate existing databases that predate the profile columns
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio        TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS home_city  TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
  `)

  // ── Plan locations ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_locations (
      id          SERIAL PRIMARY KEY,
      trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url   TEXT NOT NULL DEFAULT '',
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // ── Reviews ──────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id          SERIAL PRIMARY KEY,
      trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      comment     TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(trip_id, reviewer_id)
    );
  `)

  // ── Travel-plan tables ────────────────────────────────────────────────────
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
      id             SERIAL PRIMARY KEY,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      duration_days  INTEGER NOT NULL,
      highlights     TEXT NOT NULL DEFAULT '',
      UNIQUE(destination_id, name)
    );

    CREATE TABLE IF NOT EXISTS transport_options (
      id         SERIAL PRIMARY KEY,
      route_id   INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      provider   TEXT NOT NULL DEFAULT '',
      duration   TEXT NOT NULL DEFAULT '',
      price_from INTEGER NOT NULL DEFAULT 0,
      notes      TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS accommodation_options (
      id              SERIAL PRIMARY KEY,
      route_id        INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      type            TEXT NOT NULL,
      name            TEXT NOT NULL,
      price_per_night INTEGER NOT NULL DEFAULT 0,
      rating          NUMERIC(2,1) NOT NULL DEFAULT 0,
      notes           TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS travel_plans (
      id                      SERIAL PRIMARY KEY,
      trip_id                 INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
      destination_id          INTEGER REFERENCES destinations(id),
      route_id                INTEGER REFERENCES routes(id),
      transport_option_id     INTEGER REFERENCES transport_options(id),
      accommodation_option_id INTEGER REFERENCES accommodation_options(id),
      notes                   TEXT NOT NULL DEFAULT '',
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
