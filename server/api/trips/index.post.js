// POST /api/trips
// Creates a new trip owned by the given user.
// short_description is capped at 80 characters per the exercise spec.
// RETURNING * lets us send the newly created row back without a second query.
export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const body = await readBody(event);

  if (!user?.uid) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const {
    title,
    destination,
    start_date,
    short_description,
    detail_description
  } = body;

  if (
    !title?.trim() ||
    !destination?.trim() ||
    !start_date ||
    !short_description?.trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields"
    });
  }

  if (short_description.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: "Short description must be <= 80 chars"
    });
  }

  const db = getDb();

  const { rows } = await db.query(
    `INSERT INTO trips
     (user_id, title, destination, start_date, short_description, detail_description)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      user.uid, // NOT from client
      title.trim(),
      destination.trim(),
      start_date,
      short_description.trim(),
      detail_description?.trim() ?? ""
    ]
  );

  return rows[0];
});