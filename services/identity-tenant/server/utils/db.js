import { getPool } from '@travelmanager/shared-db'

const SERVICE = 'identity'

// identity service treats its data as global (one row per tenant) — not per-tenant-schema.
// Use shared pool with system tenant.
export function pool() {
  return getPool(SERVICE, 'system', 'standard')
}
