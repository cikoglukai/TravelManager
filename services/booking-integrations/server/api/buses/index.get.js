import { defineEventHandler, getQuery } from 'h3'

// Bus search remains a mock — real BookAway/FlixBus API integration is planned for v2.
export default defineEventHandler(async (event) => {
  const { origin, destination, departureDate } = getQuery(event)
  if (!origin || !destination || !departureDate) return []

  return [
    {
      id: 1, provider: 'FlixBus', origin, destination,
      departure: `${departureDate}T08:00:00`, arrival: `${departureDate}T14:00:00`,
      duration: '6h', price: 'EUR 19', bookingLink: 'https://www.flixbus.com',
    },
    {
      id: 2, provider: 'FlixBus', origin, destination,
      departure: `${departureDate}T15:30:00`, arrival: `${departureDate}T22:00:00`,
      duration: '6h 30m', price: 'EUR 24', bookingLink: 'https://www.flixbus.com',
    },
  ]
})
