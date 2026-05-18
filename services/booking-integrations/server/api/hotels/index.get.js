import { defineEventHandler, getQuery } from 'h3'
import { resolveBookingLocation } from '../../utils/rapidapi.js'

export default defineEventHandler(async (event) => {
  const { city, checkin, checkout } = getQuery(event)
  if (!city || !checkin || !checkout) return []
  const key = process.env.RAPIDAPI_KEY
  if (!key) return []

  const loc = await resolveBookingLocation(city)
  if (!loc) return []

  try {
    const u = new URL('https://booking-com.p.rapidapi.com/v1/hotels/search')
    Object.entries({
      dest_id:        loc.dest_id,
      dest_type:      loc.dest_type,
      checkin_date:   checkin,
      checkout_date:  checkout,
      adults_number:  '1',
      room_number:    '1',
      order_by:       'popularity',
      filter_by_currency: 'EUR',
      locale:         'en-gb',
      units:          'metric',
    }).forEach(([k, v]) => u.searchParams.set(k, v))
    const r = await fetch(u.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'booking-com.p.rapidapi.com' },
    })
    if (!r.ok) return []
    const response = await r.json()
    const hotels = response?.result || response?.hotels || []
    return hotels.slice(0, 5).map((h, i) => ({
      id:        h.hotel_id || i + 1,
      name:      h.hotel_name,
      price:     h.min_total_price ? `EUR ${Math.round(h.min_total_price)}` : 'N/A',
      rating:    h.review_score ?? null,
      photo:     h.max_photo_url ?? h.main_photo_url ?? '',
      bookLink:  h.url ?? `https://www.booking.com/hotel/${h.hotel_id}`,
    }))
  } catch (err) {
    console.error('[hotels] search failed:', err?.message || err)
    return []
  }
})
