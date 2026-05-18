import { defineEventHandler, createError } from 'h3'
import { authMiddleware } from '@travelmanager/shared-auth'

// identity-tenant is the source of truth for plan lookup. We avoid a recursion loop by short-circuiting
// the lookup against a cache populated by tenant CRUD; the BFF / other services proxy plan resolution
// through this service.
import { getPlanForTenant } from '../utils/cache.js'

export default defineEventHandler(authMiddleware({
  defineEventHandler,
  createError,
  tenantPlanLookup: getPlanForTenant,
}))
