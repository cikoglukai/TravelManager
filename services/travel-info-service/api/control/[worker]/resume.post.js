// POST /api/control/:worker/resume — resume a poller.
import { control } from '../../../utils/control.js'

export default defineEventHandler((event) => {
  const worker = getRouterParam(event, 'worker')
  if (!control[worker]) throw createError({ statusCode: 404, statusMessage: 'Unknown worker' })
  control[worker].paused = false
  return control[worker]
})
