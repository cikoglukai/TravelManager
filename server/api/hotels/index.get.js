// GET /api/hotels?city=<city>&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD
// Booking.com via RapidAPI — needs a numeric dest_id resolved through
// /v1/hotels/locations before /v1/hotels/search will accept it.
import { resolveBookingLocation } from '~~/server/utils/rapidapi.js'

export default defineEventHandler(async (event) => {
  const { city, checkin, checkout } = getQuery(event)
  if (!city || !checkin || !checkout) return []

  const config = useRuntimeConfig()
  if (!config.rapidApiKey) return []

  const loc = await resolveBookingLocation(city)
  if (!loc) return []

  try {
    const response = await $fetch(
      'https://booking-com.p.rapidapi.com/v1/hotels/search',
      {
        headers: {
          'X-RapidAPI-Key':  config.rapidApiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
        },
        query: {
          dest_id:       loc.dest_id,
          dest_type:     loc.dest_type,
          checkin_date:  checkin,
          checkout_date: checkout,
          adults_number: 1,
          room_number:   1,
          units:         'metric',
          locale:        'en-gb',
          order_by:      'popularity',
          filter_by_currency: 'EUR',
        },
      }
    )

    const results = response?.result || []

    return results.slice(0, 5).map((h, index) => ({
      id:          h.hotel_id || index + 1,
      name:        h.hotel_name || h.name || 'Hotel',
      price:       h.min_total_price ?? h.price_breakdown?.gross_price ?? null,
      currency:    h.currencycode || 'EUR',
      rating:      h.review_score ?? null,
      address:     h.address || h.city || '',
      photo:       h.max_photo_url || h.main_photo_url || '',
      bookingLink: h.url || `https://www.booking.com/hotel/${h.hotel_id}`,
    }))
  } catch (err) {
    console.error('[hotels] search failed:', err?.message || err)
    return []
  }
})
