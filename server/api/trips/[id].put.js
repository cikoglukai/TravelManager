// PUT /api/trips/:id
// Replaces all editable fields of an existing trip.
// RETURNING * avoids a separate SELECT after the update.
// Returns 404 when no row was matched (rowCount would also work, but empty rows is clearer).
import { getDb } from "~~/server/utils/db.js";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);

  const {
    title,
    destination,
    start_date,
    short_description,
    detail_description
  } = body;

  if (!title?.trim() || !destination?.trim() || !start_date || !short_description?.trim()) {
    throw createError({ statusCode: 400 });
  }

  if (short_description.length > 80) {
    throw createError({ statusCode: 400 });
  }

  const db = getDb();

  const { rows } = await db.query(
    `UPDATE trips
     SET title=$1,
         destination=$2,
         start_date=$3,
         short_description=$4,
         detail_description=$5
     WHERE id=$6 AND user_id=$7
     RETURNING *`,
    [
      title.trim(),
      destination.trim(),
      start_date,
      short_description.trim(),
      detail_description?.trim() ?? "",
      id,
      user.uid
    ]
  );

  if (!rows.length) {
    throw createError({ statusCode: 404 });
  }

  return rows[0];
});