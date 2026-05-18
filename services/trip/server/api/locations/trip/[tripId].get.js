import { defineEventHandler, getRouterParam } from 'h3'
import { pool } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'tripId'))
  const { rows } = await pool(event).query(
    `SELECT id, trip_id, name, description, image_url, date_from, date_to, position, created_at
       FROM plan_locations WHERE trip_id = $1 ORDER BY position, id`, [tripId])
  return rows
})
