import { defineEventHandler, createError } from 'h3'
import { authMiddleware } from '@travelmanager/shared-auth'

// Booking lookups can be public (the BFF caches them anonymously). For now, all routes pass through
// the standard auth middleware so usage attribution + per-tenant rate limiting work; routes that
// should be public are added to PUBLIC_PATTERNS in shared-auth.
export default defineEventHandler(authMiddleware({ defineEventHandler, createError }))
