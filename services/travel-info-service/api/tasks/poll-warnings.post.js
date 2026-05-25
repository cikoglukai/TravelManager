// POST /api/tasks/poll-warnings — invoked by the GKE CronJob (or manually via
// the control panel). Runs the warning poller + diff engine.
import { pollWarnings } from '../../utils/poller.js'

export default defineEventHandler(async () => {
  const result = await pollWarnings()
  return { ok: true, ...result }
})
