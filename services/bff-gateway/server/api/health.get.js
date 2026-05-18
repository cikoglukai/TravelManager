import { defineEventHandler } from 'h3'

export default defineEventHandler(() => ({
  service: 'bff-gateway',
  ok: true,
  upstreams: {
    trip:                Boolean(process.env.TRIP_SERVICE_URL),
    identity:            Boolean(process.env.IDENTITY_TENANT_URL),
    social:              Boolean(process.env.SOCIAL_SERVICE_URL),
    travelInfo:          Boolean(process.env.TRAVEL_INFO_SERVICE_URL),
    destination:         Boolean(process.env.DESTINATION_SERVICE_URL),
    bookingIntegrations: Boolean(process.env.BOOKING_INTEGRATIONS_URL),
    notification:        Boolean(process.env.NOTIFICATION_SERVICE_URL),
  },
  ts: new Date().toISOString(),
}))
