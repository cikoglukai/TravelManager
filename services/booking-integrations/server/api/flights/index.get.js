import { defineEventHandler, getQuery } from 'h3'
import { resolveSkyscannerEntity } from '../../utils/rapidapi.js'

export default defineEventHandler(async (event) => {
  const { origin, destination, departureDate } = getQuery(event)
  if (!origin || !destination || !departureDate) return []
  const key = process.env.RAPIDAPI_KEY
  if (!key) return []

  const [from, to] = await Promise.all([
    resolveSkyscannerEntity(origin),
    resolveSkyscannerEntity(destination),
  ])
  if (!from || !to) return []

  try {
    const u = new URL('https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights')
    Object.entries({
      originSkyId:         from.skyId,
      originEntityId:      from.entityId,
      destinationSkyId:    to.skyId,
      destinationEntityId: to.entityId,
      date:                departureDate,
      cabinClass:          'economy',
      adults:              '1',
      sortBy:              'best',
      currency:            'EUR',
      market:              'DE',
      countryCode:         'DE',
    }).forEach(([k, v]) => u.searchParams.set(k, v))
    const r = await fetch(u.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com' },
    })
    if (!r.ok) return []
    const response = await r.json()
    const itineraries = response?.data?.itineraries || []

    return itineraries.slice(0, 5).map((flight, index) => {
      const leg = flight.legs?.[0]
      return {
        id:          flight.id || index + 1,
        airline:     leg?.carriers?.marketing?.[0]?.name || 'Flight',
        origin,
        destination,
        departure:   leg?.departure,
        arrival:     leg?.arrival,
        duration:    leg?.durationInMinutes
                       ? `${Math.floor(leg.durationInMinutes / 60)}h ${leg.durationInMinutes % 60}m`
                       : null,
        price:       flight.price?.formatted || 'N/A',
        bookingLink: flight.deepLink || 'https://www.skyscanner.com',
      }
    })
  } catch (err) {
    console.error('[flights] search failed:', err?.message || err)
    return []
  }
})
