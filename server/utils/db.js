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
      'postgresql://postgres:postgres@localhost:5432/travelmanager',
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
}