import { defineEventHandler } from 'h3'

export default defineEventHandler(() => ({
  service: 'booking-integrations',
  ok: true,
  rapidapi: Boolean(process.env.RAPIDAPI_KEY),
  redis: Boolean(process.env.REDIS_URL),
  ts: new Date().toISOString(),
}))
