// POST /api/tasks/newsletter — weekly CronJob. Aggregates each user's recent
// feed highlights, logs the run and publishes a NewsletterReady event per user
// for the Notification service to deliver.
import { getDb } from '@travelmanager/shared/db'
import { publishEvent } from '@travelmanager/shared/pubsub'
import { control } from '../../utils/control.js'

export default defineEventHandler(async () => {
  const db = getDb()

  const { rows } = await db.query(
    `SELECT user_uid,
            COUNT(*)::int AS entry_count,
            json_agg(json_build_object('title', title, 'destination', destination, 'author', author_name)
                     ORDER BY score DESC) FILTER (WHERE TRUE) AS highlights
     FROM feed_entries
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY user_uid`
  )

  let notified = 0
  for (const r of rows) {
    const highlights = (r.highlights || []).slice(0, 5)
    await db.query(
      'INSERT INTO newsletter_log (user_uid, entry_count) VALUES ($1, $2)',
      [r.user_uid, r.entry_count]
    )
    await publishEvent('NewsletterReady', {
      userUid: r.user_uid,
      entryCount: r.entry_count,
      highlights,
    }).catch((e) => console.error('[social] publish NewsletterReady failed', e))
    notified++
  }

  control.newsletter.lastRun = new Date().toISOString()
  control.newsletter.usersNotified += notified
  return { ok: true, usersNotified: notified }
})
