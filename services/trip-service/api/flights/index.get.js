// GET /api/flights?origin=<city>&destination=<city>&departureDate=YYYY-MM-DD
// Skyscanner (Sky Scrapper) on RapidAPI.
import { resolveSkyscannerEntity } from '../../utils/rapidapi.js'

export default defineEventHandler(async (event) => {
  const { origin, destination, departureDate } = getQuery(event)
  if (!origin || !destination || !departureDate) return []

  const rapidApiKey = process.env.RAPIDAPI_KEY || ''
  if (!rapidApiKey) return []

  const [from, to] = await Promise.all([
    resolveSkyscannerEntity(origin),
    resolveSkyscannerEntity(destination),
  ])
  if (!from || !to) return []

  try {
    const response = await $fetch(
      'https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights',
      {
        headers: {
          'X-RapidAPI-Key':  rapidApiKey,
          'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
        },
        query: {
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
        },
      }
    )

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
