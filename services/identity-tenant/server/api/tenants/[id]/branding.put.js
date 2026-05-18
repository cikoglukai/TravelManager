import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePlan } from '@travelmanager/shared-auth'
import { pool } from '../../../utils/db.js'
import { invalidate } from '../../../utils/cache.js'

const handler = defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (id !== event.context.tenant?.tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-tenant write forbidden' })
  }
  const { logo_url, primary_color, accent_color, custom_domain, email_from_name } = await readBody(event)

  await pool().query(
    `INSERT INTO white_label (tenant_id, logo_url, primary_color, accent_color, custom_domain, email_from_name)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (tenant_id) DO UPDATE
       SET logo_url        = EXCLUDED.logo_url,
           primary_color   = EXCLUDED.primary_color,
           accent_color    = EXCLUDED.accent_color,
           custom_domain   = EXCLUDED.custom_domain,
           email_from_name = EXCLUDED.email_from_name`,
    [id, logo_url ?? '', primary_color ?? '', accent_color ?? '', custom_domain ?? '', email_from_name ?? '']
  )
  invalidate(id)
  return { ok: true }
})

// Standard plan minimum — Free tenants cannot white-label.
export default requirePlan('standard', handler, { createError })
