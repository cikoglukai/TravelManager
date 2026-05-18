// @travelmanager/shared-db
// Postgres pool factory + multi-tenant schema resolver.
//
// Tenancy model (matches plan §4):
//   Free       -> shared *_free schema, row-level tenant_id discriminator
//   Standard   -> own schema *_t_<tenantId> inside the shared service DB
//   Enterprise -> own database in a dedicated Cloud SQL instance (separate connection string)
//
// Connection string convention:
//   DATABASE_URL_<SERVICE>             — shared-instance per-service DB (e.g. DATABASE_URL_TRIP)
//   DATABASE_URL_<SERVICE>_ENT_<TENANT> — Enterprise dedicated instance per tenant

import pg from 'pg'

const { Pool } = pg
const _pools = new Map()

// Get the pg.Pool for a given service. Caches one pool per (service, tenantId-for-Enterprise).
export function getPool(serviceName, tenantId, plan) {
  const key = plan === 'enterprise'
    ? `${serviceName}::ent::${tenantId}`
    : `${serviceName}::shared`

  if (_pools.has(key)) return _pools.get(key)

  const envKey = plan === 'enterprise'
    ? `DATABASE_URL_${serviceName.toUpperCase()}_ENT_${tenantId.toUpperCase()}`
    : `DATABASE_URL_${serviceName.toUpperCase()}`

  const connectionString = process.env[envKey] || process.env.DATABASE_URL
  if (!connectionString) throw new Error(`[shared-db] Missing env ${envKey} (and no DATABASE_URL fallback)`)

  const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
  pool.on('error', (err) => console.error(`[shared-db] pool error (${key}):`, err))
  _pools.set(key, pool)
  return pool
}

// Map (tenantId, plan) -> Postgres schema name for a given service.
//   resolveSchema('trip', 'free',     ...)  -> 'trip_free'
//   resolveSchema('trip', 'standard', 'acme') -> 'trip_t_acme'
//   resolveSchema('trip', 'enterprise', 'globex') -> 'public'  (own DB)
export function resolveSchema(serviceName, plan, tenantId) {
  if (plan === 'enterprise') return 'public'
  if (plan === 'free') return `${serviceName}_free`
  return `${serviceName}_t_${sanitizeTenantId(tenantId)}`
}

function sanitizeTenantId(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9_]/g, '_')
}

// Run a function inside a transaction with `SET LOCAL search_path` to the tenant's schema.
// For Free pool, also set `tenant_id` GUC so RLS policies can read it.
export async function withTenant({ pool, tenantId, plan, serviceName }, fn) {
  const schema = resolveSchema(serviceName, plan, tenantId)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL search_path TO ${pgIdent(schema)}, public`)
    if (plan === 'free') {
      await client.query(`SET LOCAL app.tenant_id = $1`, [String(tenantId)])
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

function pgIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`[shared-db] Unsafe identifier: ${name}`)
  return `"${name}"`
}

// Convenience for non-tenant-aware queries (e.g. service health checks).
export async function query(serviceName, sql, params) {
  const pool = getPool(serviceName, 'system', 'standard')
  return pool.query(sql, params)
}
