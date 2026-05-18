import { defineEventHandler, createError } from 'h3'
import { authMiddleware } from '@travelmanager/shared-auth'
import { getPlanForTenant } from '../utils/plan-cache.js'

export default defineEventHandler(authMiddleware({
  defineEventHandler,
  createError,
  tenantPlanLookup: getPlanForTenant,
}))
