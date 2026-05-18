import { defineNitroPlugin } from 'nitropack/runtime'
import { getPool } from '@travelmanager/shared-db'

export default defineNitroPlugin(async () => {
  if (process.env.SKIP_DB_INIT === '1') return
  const p = getPool('social', 'system', 'standard')
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_uid TEXT NOT NULL,
        followee_uid TEXT NOT NULL,
        tenant_id    TEXT NOT NULL,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (follower_uid, followee_uid)
      );
      CREATE INDEX IF NOT EXISTS follows_followee_idx ON follows (followee_uid);
      CREATE INDEX IF NOT EXISTS follows_tenant_idx   ON follows (tenant_id);

      CREATE TABLE IF NOT EXISTS social_activities (
        id          SERIAL PRIMARY KEY,
        event_id    TEXT NOT NULL UNIQUE,
        actor_uid   TEXT NOT NULL,
        tenant_id   TEXT NOT NULL,
        verb        TEXT NOT NULL,
        object_id   TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS social_act_actor_idx ON social_activities (actor_uid, created_at DESC);

      CREATE TABLE IF NOT EXISTS newsletter_runs (
        id          SERIAL PRIMARY KEY,
        tenant_id   TEXT NOT NULL,
        week_of     DATE NOT NULL,
        dispatched  INTEGER NOT NULL DEFAULT 0,
        finished_at TIMESTAMPTZ,
        UNIQUE (tenant_id, week_of)
      );
    `)
    console.log('[social] db schema ready')
  } catch (e) {
    console.error('[social] db init failed:', e.message)
  }
})
