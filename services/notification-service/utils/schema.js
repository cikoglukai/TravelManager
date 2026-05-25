// Notification DB: delivery log (audit of what was sent).
import { getDb } from '@travelmanager/shared/db'

export async function initNotificationDb() {
  const db = getDb()
  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id         SERIAL      PRIMARY KEY,
      user_uid   TEXT        NOT NULL,
      kind       TEXT        NOT NULL,
      subject    TEXT        NOT NULL DEFAULT '',
      delivered  BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
