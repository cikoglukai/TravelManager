import { initDestinationDb } from '../utils/schema.js'
import { seedDb } from '../utils/seed.js'

export default defineNitroPlugin(() => {
  initDestinationDb()
    .then(() => seedDb())
    .then(() => console.log('[destination-service] schema + seed ready'))
    .catch((err) => console.error('[destination-service] bootstrap failed', err))
})
