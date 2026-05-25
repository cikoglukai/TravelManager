// GET /api/travel-plans/:tripId
// Custom plans are self-contained. Template plans store only the
// destination/route/option IDs — those live in the Destination service's DB, so
// we hydrate them over HTTP (DB-per-service: no cross-service SQL join).
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const db = getDb()
  const { rows } = await db.query('SELECT * FROM travel_plans WHERE trip_id = $1', [tripId])
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'No travel plan found' })

  const plan = rows[0]
  if (plan.mode !== 'template') return plan

  const base = process.env.DESTINATION_SERVICE_URL || 'http://localhost:3003'
  const refs = await $fetch('/api/plan-refs', {
    baseURL: base,
    query: {
      destination_id: plan.destination_id,
      route_id: plan.route_id,
      transport_option_id: plan.transport_option_id,
      accommodation_option_id: plan.accommodation_option_id,
    },
  }).catch((e) => {
    console.error('[travel-plans.get] destination hydrate failed', e)
    return {}
  })

  return { ...plan, ...refs }
})
