// Nitro server plugin — runs once when the server starts.
// Ensures all database tables exist and seed data is loaded before the first request.
import { initDb } from '~~/server/utils/db.js'
import { seedDb } from '~~/server/utils/seed.js'

export default defineNitroPlugin(async () => {
  await initDb()
  await seedDb()
})