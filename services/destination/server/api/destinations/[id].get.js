import { defineEventHandler, getRouterParam, createError } from 'h3'
import { pool } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad id' })
  const { rows } = await pool().query(`SELECT * FROM destinations WHERE id = $1`, [id])
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const routes = await pool().query(
    `SELECT r.id, r.name, r.description, r.duration_days, r.highlights,
            COALESCE((SELECT json_agg(t) FROM transport_options t WHERE t.route_id = r.id), '[]'::json) AS transport,
            COALESCE((SELECT json_agg(a) FROM accommodation_options a WHERE a.route_id = r.id), '[]'::json) AS accommodation
       FROM routes r WHERE r.destination_id = $1`,
    [id]
  )
  return { ...rows[0], routes: routes.rows }
})
