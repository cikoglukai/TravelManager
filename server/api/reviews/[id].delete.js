// DELETE /api/reviews/:id
// Deletes a review. Only the reviewer can delete their own review.
import { getDb } from '~~/server/utils/db.js'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { reviewer_id } = await readBody(event)

  if (!reviewer_id) throw createError({ statusCode: 400, statusMessage: 'reviewer_id required' })

  const db = getDb()
  const { rowCount } = await db.query(
    'DELETE FROM reviews WHERE id = $1 AND reviewer_id = $2',
    [id, reviewer_id]
  )

  if (!rowCount) throw createError({ statusCode: 403, statusMessage: 'Review not found or not yours' })

  return { ok: true }
})
