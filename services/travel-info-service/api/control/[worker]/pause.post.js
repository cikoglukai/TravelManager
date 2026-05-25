// POST /api/control/:worker/pause — pause a poller (worker = warnings|weather).
import { control } from '../../../utils/control.js'

export default defineEventHandler((event) => {
  const worker = getRouterParam(event, 'worker')
  if (!control[worker]) throw createError({ statusCode: 404, statusMessage: 'Unknown worker' })
  control[worker].paused = true
  return control[worker]
})
