// GET /api/destinations/:id/routes
// Returns all routes for a destination, each including its transport and
// accommodation options so the wizard can work fully client-side.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const destId = Number(getRouterParam(event, 'id'))
  if (!destId) throw createError({ statusCode: 400, statusMessage: 'Invalid destination ID' })

  const db = getDb()

  const { rows: routes } = await db.query(
    `SELECT id, name, description, duration_days, highlights
     FROM routes WHERE destination_id = $1 ORDER BY id ASC`,
    [destId]
  )
  if (!routes.length) throw createError({ statusCode: 404, statusMessage: 'No routes found for this destination' })

  // Attach transport and accommodation options to each route
  const routeIds = routes.map(r => r.id)

  const { rows: transport } = await db.query(
    `SELECT id, route_id, type, provider, duration, price_from, notes
     FROM transport_options WHERE route_id = ANY($1) ORDER BY price_from ASC`,
    [routeIds]
  )

  const { rows: accommodation } = await db.query(
    `SELECT id, route_id, type, name, price_per_night, rating, notes
     FROM accommodation_options WHERE route_id = ANY($1) ORDER BY price_per_night ASC`,
    [routeIds]
  )

  return routes.map(r => ({
    ...r,
    transport_options:     transport.filter(t => t.route_id === r.id),
    accommodation_options: accommodation.filter(a => a.route_id === r.id),
  }))
})
