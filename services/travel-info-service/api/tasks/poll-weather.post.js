// POST /api/tasks/poll-weather — invoked by the GKE CronJob. Lower priority.
import { pollWeather } from '../../utils/poller.js'

export default defineEventHandler(async () => {
  const result = await pollWeather()
  return { ok: true, ...result }
})
