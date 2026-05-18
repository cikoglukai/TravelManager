import { getPool } from '@travelmanager/shared-db'

export function pool() {
  return getPool('notification', 'system', 'standard')
}
