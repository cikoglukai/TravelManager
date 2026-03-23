// GET /api/trips/:id
// Returns all columns for a single trip (including detail_description).
// Used by the trip detail page to show full trip information.
import {getDb} from "~~/server/utils/db.js";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [id])

  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  }

  return rows[0]
})