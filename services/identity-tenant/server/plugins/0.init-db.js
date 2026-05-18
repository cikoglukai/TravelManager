import { defineNitroPlugin } from 'nitropack/runtime'
import { getPool } from '@travelmanager/shared-db'

export default defineNitroPlugin(async () => {
  if (process.env.SKIP_DB_INIT === '1') return
  const p = getPool('identity', 'system', 'standard')
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        plan       TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','standard','enterprise')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS white_label (
        tenant_id       TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        logo_url        TEXT NOT NULL DEFAULT '',
        primary_color   TEXT NOT NULL DEFAULT '',
        accent_color    TEXT NOT NULL DEFAULT '',
        custom_domain   TEXT NOT NULL DEFAULT '',
        email_from_name TEXT NOT NULL DEFAULT '',
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sso_config (
        tenant_id    TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
        provider     TEXT NOT NULL,
        metadata_url TEXT NOT NULL DEFAULT '',
        config_json  JSONB NOT NULL DEFAULT '{}',
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS users (
        firebase_uid TEXT NOT NULL,
        tenant_id    TEXT NOT NULL REFERENCES tenants(id),
        email        TEXT NOT NULL,
        name         TEXT NOT NULL,
        bio          TEXT NOT NULL DEFAULT '',
        home_city    TEXT NOT NULL DEFAULT '',
        avatar_url   TEXT NOT NULL DEFAULT '',
        role         TEXT NOT NULL DEFAULT 'member',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, tenant_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users(tenant_id, email);

      -- Seed dev tenant (matches shared-auth dev/localhost fallback)
      INSERT INTO tenants (id, name, plan)
        VALUES ('dev', 'Dev Tenant', 'enterprise')
        ON CONFLICT (id) DO NOTHING;
    `)
    console.log('[identity-tenant] db schema ready')
  } catch (e) {
    console.error('[identity-tenant] db init failed:', e.message)
  }
})
