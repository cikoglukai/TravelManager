// Nitro server plugin — runs once when the server starts.
// Ensures all database tables exist before the first request is handled.
import {initDb} from "~~/server/utils/db.js";

export default defineNitroPlugin(async () => {
  await initDb()
})