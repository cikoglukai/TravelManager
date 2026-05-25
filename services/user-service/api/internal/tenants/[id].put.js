// PUT /api/internal/tenants/:id — upsert a tenant's plan + white-label config.
// Internal/ops endpoint (gateway-blocked); used to provision Standard/Enterprise
// customers and their branding. Body: { name?, plan?, logo_url?, brand_color?, custom_domain? }.
import { getDb } from '@travelmanager/shared/db'

const PLANS = ['free', 'standard', 'enterprise']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const b = await readBody(event)
  if (b.plan && !PLANS.includes(b.plan)) {
    throw createError({ statusCode: 400, statusMessage: `plan must be one of ${PLANS.join(', ')}` })
  }

  const db = getDb()
  const { rows } = await db.query(
    `INSERT INTO tenants (id, name, plan, logo_url, brand_color, custom_domain)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name          = COALESCE(NULLIF($2,''), tenants.name),
       plan          = COALESCE($3, tenants.plan),
       logo_url      = COALESCE($4, tenants.logo_url),
       brand_color   = COALESCE($5, tenants.brand_color),
       custom_domain = COALESCE($6, tenants.custom_domain)
     RETURNING id, name, plan, logo_url, brand_color, custom_domain`,
    [id, b.name ?? '', b.plan ?? 'free', b.logo_url ?? null, b.brand_color ?? null, b.custom_domain ?? null]
  )
  return rows[0]
})
