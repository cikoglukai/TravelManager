// GET /api/internal/tenants/:id — FULL tenant record incl. plan + custom_domain.
// Internal only (gateway blocks /api/internal publicly). The gateway calls this
// to resolve a caller's plan for rate limiting and feature gating.
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()
  const { rows } = await db.query(
    'SELECT id, name, plan, logo_url, brand_color, custom_domain FROM tenants WHERE id = $1',
    [id]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  return rows[0]
})
