// Test-only: publish a synthetic travel.warning.published event.
// Gated by X-Test-Token header matching env TEST_TOKEN.

import { defineEventHandler, readBody, createError } from 'h3'
import { publish } from '@travelmanager/shared-events'

export default defineEventHandler(async (event) => {
  const expected = process.env.TEST_TOKEN
  const got = event.node?.req?.headers?.['x-test-token']
  if (!expected || got !== expected) {
    throw createError({ statusCode: 403, statusMessage: 'Test endpoint disabled or token mismatch' })
  }
  const body = await readBody(event)
  const { messageId, eventId } = await publish('travel.warning.published', body, {
    tenantId: body.tenantId || 'system',
  })
  return { ok: true, messageId, eventId }
})
