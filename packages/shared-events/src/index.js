// @travelmanager/shared-events
// Pub/Sub publish + push-subscription helpers with JSON Schema validation.
//
// Every event payload is wrapped:
//   {
//     eventId:    uuid,
//     tenantId:   string,
//     occurredAt: ISO timestamp,
//     version:    integer,
//     ...domain-specific fields
//   }

import { PubSub } from '@google-cloud/pubsub'
import Ajv from 'ajv'
import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMAS_DIR = resolve(__dirname, '../schemas')

let _pubsub = null
function getPubsub() {
  if (!_pubsub) {
    _pubsub = new PubSub({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  return _pubsub
}

const ajv = new Ajv({ allErrors: true, removeAdditional: false })
const _validators = new Map()

function getValidator(topic) {
  if (_validators.has(topic)) return _validators.get(topic)
  const schemaPath = resolve(SCHEMAS_DIR, `${topic}.json`)
  if (!existsSync(schemaPath)) {
    // Permissive when no schema exists — useful during early bootstrap.
    const validator = () => true
    _validators.set(topic, validator)
    return validator
  }
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
  const validator = ajv.compile(schema)
  _validators.set(topic, validator)
  return validator
}

// Publish a domain event. Auto-fills eventId + occurredAt if not provided.
export async function publish(topic, payload, { tenantId, version = 1 } = {}) {
  const enriched = {
    eventId: payload.eventId ?? randomUUID(),
    tenantId: tenantId ?? payload.tenantId,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    version,
    ...payload,
  }
  const validate = getValidator(topic)
  if (!validate(enriched)) {
    throw new Error(`[shared-events] payload invalid for ${topic}: ${JSON.stringify(validate.errors)}`)
  }
  const data = Buffer.from(JSON.stringify(enriched))
  const messageId = await getPubsub().topic(topic).publishMessage({
    data,
    attributes: {
      eventId: enriched.eventId,
      tenantId: String(enriched.tenantId ?? ''),
      version: String(version),
    },
  })
  return { messageId, eventId: enriched.eventId }
}

// Build a Nitro/h3 handler that validates an incoming Pub/Sub push request and dispatches to `fn`.
//   import { defineEventHandler, readBody } from 'h3'
//   import { subscribeHandler } from '@travelmanager/shared-events'
//   export default defineEventHandler(subscribeHandler('trip.created', async (event, payload) => {
//     // ...handle event
//   }))
//
// Pub/Sub push body shape: { message: { data: base64, attributes }, subscription }
export function subscribeHandler(topic, fn, { defineEventHandler, readBody, createError, verifyPubsubPushToken } = {}) {
  return async (event) => {
    if (verifyPubsubPushToken) {
      await verifyPubsubPushToken(event, { createError })
    }
    const body = await readBody(event)
    if (!body?.message?.data) {
      throw createError({ statusCode: 400, statusMessage: 'Missing Pub/Sub message body' })
    }
    let payload
    try {
      payload = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf8'))
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Bad message JSON' })
    }
    const validate = getValidator(topic)
    if (!validate(payload)) {
      throw createError({ statusCode: 400, statusMessage: `Schema violation: ${JSON.stringify(validate.errors)}` })
    }
    return fn(event, payload, body.message.attributes)
  }
}
