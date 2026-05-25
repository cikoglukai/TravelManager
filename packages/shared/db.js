// Shared Postgres pool factory. Each microservice owns its own database, so the
// connection string is service-specific (DATABASE_URL). One pool per process,
// lazily created. 12-Factor: config comes from the environment only.
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
