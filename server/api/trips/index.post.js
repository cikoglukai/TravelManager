// POST /api/trips
// Creates a new trip owned by the given user.
// short_description is capped at 80 characters per the exercise spec.
// RETURNING * lets us send the newly created row back without a second query.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { user_id, title, destination, start_date, short_description, detail_description } = body

  if (!user_id || !title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'user_id, title, destination, start_date and short_description are required',
    })
  }

  if (short_description.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Short description must be 80 characters or less' })
  }

  const db = getDb()
  const { rows } = await db.query(
    `INSERT INTO trips (user_id, title, destination, start_date, short_description, detail_description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      Number(user_id),
      title.trim(),
      destination.trim(),
      start_date,
      short_description.trim(),
      detail_description?.trim() ?? '', // optional field — defaults to empty string
    ]
  )
  return rows[0]
})