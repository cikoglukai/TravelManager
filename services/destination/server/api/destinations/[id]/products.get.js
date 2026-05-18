import { defineEventHandler, getRouterParam } from 'h3'
import { pool } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { rows } = await pool().query(
    `SELECT id, destination_id, name, description, price_eur, plan_required FROM products WHERE destination_id = $1`,
    [id]
  )
  return rows
})
