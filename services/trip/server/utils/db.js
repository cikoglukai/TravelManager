import { getPool, withTenant } from '@travelmanager/shared-db'

const SERVICE = 'trip'

export function pool(event) {
  const { tenantId, plan } = event.context.tenant ?? { tenantId: 'public', plan: 'free' }
  return getPool(SERVICE, tenantId, plan)
}

export function tx(event, fn) {
  const { tenantId, plan } = event.context.tenant ?? { tenantId: 'public', plan: 'free' }
  return withTenant({ pool: pool(event), tenantId, plan, serviceName: SERVICE }, fn)
}
