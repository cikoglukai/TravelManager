// Test-only: trigger a newsletter run for a given tenant. Gated by X-Test-Token.

import { defineEventHandler, readBody, createError } from 'h3'
import { publish } from '@travelmanager/shared-events'

export default defineEventHandler(async (event) => {
  const expected = process.env.TEST_TOKEN
  const got = event.node?.req?.headers?.['x-test-token']
  if (!expected || got !== expected) {
    throw createError({ statusCode: 403, statusMessage: 'Test endpoint disabled or token mismatch' })
  }
  const body = await readBody(event)
  const { messageId, eventId } = await publish('newsletter.scheduled', body, {
    tenantId: body.tenantId || 'system',
  })
  return { ok: true, messageId, eventId }
})
