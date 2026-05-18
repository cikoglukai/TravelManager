import { defineNitroPlugin } from 'nitropack/runtime'
import { getPool } from '@travelmanager/shared-db'

export default defineNitroPlugin(async () => {
  if (process.env.SKIP_DB_INIT === '1') return
  const p = getPool('notification', 'system', 'standard')
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS preferences (
        user_uid       TEXT NOT NULL,
        tenant_id      TEXT NOT NULL,
        email_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
        push_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
        in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at     TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_uid, tenant_id)
      );
      CREATE TABLE IF NOT EXISTS delivery_log (
        event_id      TEXT PRIMARY KEY,
        user_uid      TEXT NOT NULL,
        tenant_id     TEXT NOT NULL,
        template      TEXT NOT NULL,
        channels_json JSONB NOT NULL DEFAULT '[]',
        results_json  JSONB NOT NULL DEFAULT '[]',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS delivery_log_user_idx ON delivery_log (user_uid, tenant_id);

      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id         SERIAL PRIMARY KEY,
        user_uid   TEXT NOT NULL,
        tenant_id  TEXT NOT NULL,
        template   TEXT NOT NULL,
        subject    TEXT NOT NULL DEFAULT '',
        data       JSONB NOT NULL DEFAULT '{}',
        read_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS in_app_user_idx ON in_app_notifications (user_uid, tenant_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS suppressions (
        user_uid    TEXT NOT NULL,
        tenant_id   TEXT NOT NULL,
        channel     TEXT NOT NULL,
        reason      TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_uid, tenant_id, channel)
      );

      -- Cache of user contact info, populated on demand by a sync job (out of scope for v1).
      CREATE TABLE IF NOT EXISTS users_cache (
        user_uid   TEXT NOT NULL,
        tenant_id  TEXT NOT NULL,
        email      TEXT NOT NULL,
        name       TEXT NOT NULL DEFAULT '',
        locale     TEXT NOT NULL DEFAULT 'en',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_uid, tenant_id)
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id                SERIAL PRIMARY KEY,
        user_uid          TEXT NOT NULL,
        tenant_id         TEXT NOT NULL,
        endpoint          TEXT NOT NULL,
        subscription_json JSONB NOT NULL,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_uid, tenant_id, endpoint)
      );
      CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions (user_uid, tenant_id);
    `)
    console.log('[notification] db schema ready')
  } catch (e) {
    console.error('[notification] db init failed:', e.message)
  }
})
