// GET /api/b2b/destinations/:id/travelers
// B2B partner data access (Destination Management). Returns AGGREGATED,
// anonymized traveller marketing data for a destination — never PII.
// Enterprise-only: the gateway forwards x-plan; we hard-check it here too
// (defense in depth) and require the destinationMgr role.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (user.plan !== 'enterprise') {
    throw createError({ statusCode: 403, statusMessage: 'B2B data access requires the Enterprise plan' })
  }
  if (user.role !== 'destinationMgr') {
    throw createError({ statusCode: 403, statusMessage: 'Destination Manager role required' })
  }

  const destId = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const { rows } = await db.query(
    'SELECT id, country, city FROM destinations WHERE id = $1',
    [destId]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Destination not found' })
  const dest = rows[0]

  // Trip data lives in the Trip service. Fetch aggregated, anonymized stats.
  const base = process.env.TRIP_SERVICE_URL || 'http://localhost:3002'
  const stats = await $fetch('/api/internal/destination-stats', {
    baseURL: base,
    query: { city: dest.city, country: dest.country },
  }).catch((e) => {
    console.error('[b2b] trip stats fetch failed', e)
    return { tripCount: 0, upcomingCount: 0, topOrigins: [] }
  })

  return {
    destination: { id: dest.id, country: dest.country, city: dest.city },
    aggregates: stats,
    generatedAt: new Date().toISOString(),
    note: 'Aggregated, anonymized data. No personally identifiable information.',
  }
})
