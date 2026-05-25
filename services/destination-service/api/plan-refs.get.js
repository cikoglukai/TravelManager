// GET /api/plan-refs?destination_id=&route_id=&transport_option_id=&accommodation_option_id=
// Internal hydration endpoint: the Trip service calls this to resolve a
// template travel plan's IDs into display fields (replaces the old cross-DB
// JOIN). Returns the same aliased shape the frontend already expects.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = getDb()
  const out = {}

  if (q.destination_id) {
    const { rows } = await db.query(
      'SELECT id, country, city, emoji, description FROM destinations WHERE id = $1',
      [Number(q.destination_id)]
    )
    if (rows[0]) {
      out.destination_id = rows[0].id
      out.country = rows[0].country
      out.city = rows[0].city
      out.emoji = rows[0].emoji
      out.destination_description = rows[0].description
    }
  }

  if (q.route_id) {
    const { rows } = await db.query(
      'SELECT id, name, description, duration_days, highlights FROM routes WHERE id = $1',
      [Number(q.route_id)]
    )
    if (rows[0]) {
      out.route_id = rows[0].id
      out.route_name = rows[0].name
      out.route_description = rows[0].description
      out.duration_days = rows[0].duration_days
      out.highlights = rows[0].highlights
    }
  }

  if (q.transport_option_id) {
    const { rows } = await db.query(
      'SELECT id, type, provider, duration, price_from, notes FROM transport_options WHERE id = $1',
      [Number(q.transport_option_id)]
    )
    if (rows[0]) {
      out.transport_id = rows[0].id
      out.transport_type = rows[0].type
      out.provider = rows[0].provider
      out.transport_duration = rows[0].duration
      out.price_from = rows[0].price_from
      out.transport_notes = rows[0].notes
    }
  }

  if (q.accommodation_option_id) {
    const { rows } = await db.query(
      'SELECT id, type, name, price_per_night, rating, notes FROM accommodation_options WHERE id = $1',
      [Number(q.accommodation_option_id)]
    )
    if (rows[0]) {
      out.accommodation_id = rows[0].id
      out.accommodation_type = rows[0].type
      out.accommodation_name = rows[0].name
      out.price_per_night = rows[0].price_per_night
      out.rating = rows[0].rating
      out.accommodation_notes = rows[0].notes
    }
  }

  return out
})
