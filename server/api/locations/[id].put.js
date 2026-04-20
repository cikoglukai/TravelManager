// PUT /api/locations/:id
// Updates a location's name, description and/or image.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid location ID' })

  const { name, description, image_url } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE plan_locations
     SET name = $1, description = $2, image_url = $3
     WHERE id = $4
     RETURNING id, trip_id, name, description, image_url, position, created_at`,
    [name.trim(), description?.trim() ?? '', image_url?.trim() ?? '', id]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
  return rows[0]
})
