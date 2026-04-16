// GET /api/trips?userId=<id>
// Returns a summary list of all trips belonging to the given user,
// ordered by start date descending (most upcoming/recent first).
// Only the fields needed for the trip list card are selected — the full
// detail_description is fetched separately on the detail page.
import { getDb } from "~~/server/utils/db.js";

export default defineEventHandler(async (event) => {
  const user = event.context.user;

  if (!user?.uid) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const db = getDb();

  const { rows } = await db.query(
    `SELECT id, title, destination, start_date, short_description
     FROM trips
     WHERE user_id = $1
     ORDER BY start_date DESC`,
    [user.uid] // 🔥 from JWT, NOT frontend
  );

  return rows;
});