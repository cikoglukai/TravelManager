// Non-blocking schema bootstrap on startup (Cloud Run / GKE need a fast listen).
import { initUserDb } from '../utils/schema.js'

export default defineNitroPlugin(() => {
  initUserDb()
    .then(() => console.log('[user-service] schema ready'))
    .catch((err) => console.error('[user-service] schema bootstrap failed', err))
})
