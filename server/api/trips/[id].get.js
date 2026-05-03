// GET /api/trips/:id — any authenticated user can view any trip (for community)
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const db = getDb()
  const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [id])
  if (!rows.length) throw createError({ statusCode: 404 })
  return rows[0]
})
