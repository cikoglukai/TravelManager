import { initTripDb } from '../utils/schema.js'

export default defineNitroPlugin(() => {
  initTripDb()
    .then(() => console.log('[trip-service] schema ready'))
    .catch((err) => console.error('[trip-service] schema bootstrap failed', err))
})
