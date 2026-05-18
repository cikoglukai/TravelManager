import { getPool } from '@travelmanager/shared-db'

export function pool() {
  return getPool('travel_info', 'system', 'standard')
}
