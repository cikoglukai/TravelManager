// DELETE /api/locations/:id
// Removes a location from a travel plan.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid location ID' })

  const db = getDb()
  const { rowCount } = await db.query(
    'DELETE FROM plan_locations WHERE id = $1',
    [id]
  )
  if (!rowCount) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
  return { success: true }
})
