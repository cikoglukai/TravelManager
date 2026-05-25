import { initTravelInfoDb } from '../utils/schema.js'

export default defineNitroPlugin(() => {
  initTravelInfoDb()
    .then(() => console.log('[travel-info-service] schema ready'))
    .catch((err) => console.error('[travel-info-service] schema bootstrap failed', err))
})
