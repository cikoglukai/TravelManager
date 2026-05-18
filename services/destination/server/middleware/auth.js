import { defineEventHandler, createError } from 'h3'
import { authMiddleware } from '@travelmanager/shared-auth'

export default defineEventHandler(authMiddleware({ defineEventHandler, createError }))
