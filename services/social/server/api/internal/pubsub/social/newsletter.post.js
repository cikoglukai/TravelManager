// Weekly newsletter dispatcher. Triggered by Cloud Scheduler -> newsletter.scheduled.
// For each user in the tenant: collect last week's followed activity + any travel warnings;
// render Handlebars template; publish notification.requested(channel=email, template=newsletter).

import { defineEventHandler, readBody, createError } from 'h3'
import { subscribeHandler, publish } from '@travelmanager/shared-events'
import { verifyPubsubPushToken } from '@travelmanager/shared-auth'
import { pool } from '../../../../utils/db.js'
import Handlebars from 'handlebars'

const skipVerify = process.env.SKIP_PUBSUB_VERIFY === '1' || !process.env.PUBSUB_PUSH_AUDIENCE
const verifier = skipVerify ? null : verifyPubsubPushToken

const TEMPLATE = Handlebars.compile(`
<h1>{{tenantName}} weekly digest</h1>
<p>Week of {{weekOf}}</p>
{{#if activity.length}}
  <h2>From people you follow</h2>
  <ul>
  {{#each activity}}
    <li>{{actorName}} {{verb}} {{objectLabel}}</li>
  {{/each}}
  </ul>
{{else}}
  <p>No new activity this week.</p>
{{/if}}
`)

export default defineEventHandler(subscribeHandler('newsletter.scheduled',
  async (_event, payload) => {
    // Get distinct users in this tenant — for v1 we use the cached follows table; in production
    // we'd query identity-tenant for all tenant users.
    const usersQ = await pool().query(
      `SELECT DISTINCT follower_uid AS user_uid FROM follows WHERE tenant_id = $1`,
      [payload.tenantId]
    )

    const weekStart = new Date(payload.weekOf)
    let dispatched = 0
    for (const u of usersQ.rows) {
      const acts = await pool().query(
        `SELECT a.actor_uid AS actorName, a.verb, a.object_id AS objectLabel
           FROM social_activities a
           JOIN follows f ON f.followee_uid = a.actor_uid
          WHERE f.follower_uid = $1
            AND a.created_at >= $2
            AND a.created_at <  $2 + INTERVAL '7 days'
          ORDER BY a.created_at DESC LIMIT 50`,
        [u.user_uid, weekStart.toISOString()]
      )
      const html = TEMPLATE({
        tenantName: payload.tenantId,
        weekOf:     payload.weekOf,
        activity:   acts.rows,
      })
      await publish('notification.requested', {
        userUid:  u.user_uid,
        channel:  ['email'],
        template: 'newsletter',
        data:     { weekOf: payload.weekOf, summary: { activityCount: acts.rowCount }, html },
        priority: 'low',
      }, { tenantId: payload.tenantId })
      dispatched++
      if (dispatched % 1000 === 0) await sleep(60_000)  // SendGrid throttle: 1k/min
    }
    return { ok: true, dispatched }
  },
  { defineEventHandler, readBody, createError, verifyPubsubPushToken: verifier }
))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
