// PUT /api/locations/:id
// Updates a location's name, description and/or image.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid location ID' })

  const { name, description, image_url, date_from, date_to } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Location name is required' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `UPDATE plan_locations
     SET name = $1, description = $2, image_url = $3, date_from = $4, date_to = $5
     WHERE id = $6
       AND trip_id IN (SELECT id FROM trips WHERE user_uid = $7)
     RETURNING id, trip_id, name, description, image_url, date_from, date_to, position, created_at`,
    [name.trim(), description?.trim() ?? '', image_url?.trim() ?? '', date_from ?? null, date_to ?? null, id, user.uid]
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Location not found' })
  return rows[0]
})
