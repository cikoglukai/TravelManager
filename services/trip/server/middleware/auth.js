import { defineEventHandler, createError } from 'h3'
import { authMiddleware } from '@travelmanager/shared-auth'

// Trip service does not own tenant config — receives plan via subdomain resolution.
// For Standard+, identity-tenant service is the source of truth (lookup proxied via BFF).
export default defineEventHandler(authMiddleware({ defineEventHandler, createError }))
