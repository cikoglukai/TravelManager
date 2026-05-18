import { defineEventHandler, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const t = event.context.tenant
  if (!t?.tenantId) throw createError({ statusCode: 400, statusMessage: 'Tenant unresolved' })
  const { rows } = await pool().query(
    `SELECT t.id, t.name, t.plan, t.created_at,
            COALESCE(w.logo_url, '')         AS logo_url,
            COALESCE(w.primary_color, '')    AS primary_color,
            COALESCE(w.accent_color, '')     AS accent_color,
            COALESCE(w.custom_domain, '')    AS custom_domain,
            COALESCE(w.email_from_name, '')  AS email_from_name
       FROM tenants t LEFT JOIN white_label w ON w.tenant_id = t.id
      WHERE t.id = $1`, [t.tenantId])
  if (rows.length === 0) {
    return { id: t.tenantId, name: t.tenantId, plan: 'free' }
  }
  return rows[0]
})
