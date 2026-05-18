import { getPool } from '@travelmanager/shared-db'

export function pool() {
  return getPool('destination', 'system', 'standard')
}
