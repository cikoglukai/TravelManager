// DELETE /api/travel-plans/:tripId
// Removes the travel plan for a trip.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const tripId = Number(getRouterParam(event, 'tripId'))
  if (!tripId) throw createError({ statusCode: 400, statusMessage: 'Invalid trip ID' })

  const db = getDb()
  const { rowCount } = await db.query(
    `DELETE FROM travel_plans tp
     USING trips t
     WHERE tp.trip_id = $1 AND tp.trip_id = t.id AND t.user_uid = $2`,
    [tripId, user.uid]
  )
  if (!rowCount) throw createError({ statusCode: 404, statusMessage: 'No travel plan found' })
  return { success: true }
})
