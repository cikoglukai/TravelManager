// Nitro server plugin: start database setup without blocking the HTTP listener.
// Cloud Run requires the container to listen quickly on PORT/NITRO_PORT.
import { initDb } from '~~/server/utils/db.js'
import { seedDb } from '~~/server/utils/seed.js'

let setupStarted = false

export default defineNitroPlugin(() => {
  if (setupStarted) return
  setupStarted = true

  initDb()
    .then(() => seedDb())
    .then(() => {
      console.log('[db] setup completed')
    })
    .catch((error) => {
      console.error('[db] setup failed', error)
    })
})
