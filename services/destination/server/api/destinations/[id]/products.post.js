import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePlan } from '@travelmanager/shared-auth'
import { pool } from '../../../utils/db.js'

const handler = defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const id = Number(getRouterParam(event, 'id'))
  const { name, description, price_eur, plan_required } = await readBody(event)
  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name required' })

  const { rows } = await pool().query(
    `INSERT INTO products (destination_id, name, description, price_eur, plan_required, created_by_tenant)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, name.trim(), description ?? '', price_eur ?? 0, plan_required ?? 'free', event.context.tenant.tenantId]
  )
  return rows[0]
})

// Standard tenants can list products at their owned destinations.
export default requirePlan('standard', handler, { createError })
