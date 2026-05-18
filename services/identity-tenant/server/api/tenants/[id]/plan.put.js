import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { publish } from '@travelmanager/shared-events'
import { pool } from '../../../utils/db.js'
import { invalidate } from '../../../utils/cache.js'

// Admin-only: change a tenant's plan. Emits tenant.plan.changed.
// AuthZ note: in v1 this is gated by env-var SUPERADMIN_UID — promote to a proper admin role table later.
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.uid || user.uid !== process.env.SUPERADMIN_UID) {
    throw createError({ statusCode: 403, statusMessage: 'Superadmin only' })
  }
  const id = getRouterParam(event, 'id')
  const { newPlan } = await readBody(event)
  if (!['free', 'standard', 'enterprise'].includes(newPlan)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan' })
  }

  const { rows } = await pool().query(
    `UPDATE tenants SET plan = $1 WHERE id = $2 RETURNING id, plan AS new_plan,
       (SELECT plan FROM tenants WHERE id = $2) AS old_plan_dummy`,
    [newPlan, id]
  )
  // Capture old plan via separate SELECT before UPDATE for accuracy:
  const before = await pool().query(`SELECT plan FROM tenants WHERE id = $1`, [id])
  const oldPlan = before.rows[0]?.plan ?? 'free'

  invalidate(id)

  await publish('tenant.plan.changed', {
    tenantId: id,
    oldPlan,
    newPlan,
  }, { tenantId: id })

  return { id, oldPlan, newPlan }
})
