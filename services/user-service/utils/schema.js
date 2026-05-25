// User DB schema. Owns user profiles plus the SaaS tenant/plan tables that the
// API Gateway reads to enforce tiers (Free / Standard / Enterprise) and
// white-labelling. Auto-imported by Nitro (initUserDb is callable globally).
import { getDb } from '@travelmanager/shared/db'

export async function initUserDb() {
  const db = getDb()

  await db.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id            TEXT        PRIMARY KEY,
      name          TEXT        NOT NULL,
      plan          TEXT        NOT NULL DEFAULT 'free',
      logo_url      TEXT        NOT NULL DEFAULT '',
      brand_color   TEXT        NOT NULL DEFAULT '',
      custom_domain TEXT        NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    -- Default catch-all tenant. 'standard' so gating is meaningful out of the
    -- box (feed/newsletter work; B2B stays Enterprise-gated). Upgrade per tenant
    -- via the internal tenant endpoint.
    INSERT INTO tenants (id, name, plan)
    VALUES ('default', 'TravelManager', 'standard')
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS users (
      firebase_uid TEXT        PRIMARY KEY,
      email        TEXT        NOT NULL UNIQUE,
      name         TEXT        NOT NULL,
      bio          TEXT        NOT NULL DEFAULT '',
      home_city    TEXT        NOT NULL DEFAULT '',
      avatar_url   TEXT        NOT NULL DEFAULT '',
      tenant_id    TEXT        NOT NULL DEFAULT 'default',
      role         TEXT        NOT NULL DEFAULT 'traveler',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
