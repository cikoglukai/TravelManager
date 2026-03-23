// DELETE /api/trips/:id
// Removes a trip by its primary key.
// rowCount is 0 when no row matched, which means the trip did not exist.
import {getDb} from "~~/server/utils/db.js";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const { rowCount } = await db.query('DELETE FROM trips WHERE id = $1', [id])

  if (!rowCount) {
    throw createError({ statusCode: 404, statusMessage: 'Trip not found' })
  }

  return { success: true }
})