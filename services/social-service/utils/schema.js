// Social DB schema. Follow graph + precomputed feed entries + newsletter log.
import { getDb } from '@travelmanager/shared/db'

export async function initSocialDb() {
  const db = getDb()
  await db.query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_uid TEXT        NOT NULL,
      followee_uid TEXT        NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (follower_uid, followee_uid)
    );

    CREATE TABLE IF NOT EXISTS feed_entries (
      id          SERIAL      PRIMARY KEY,
      user_uid    TEXT        NOT NULL,
      trip_id     INTEGER     NOT NULL,
      author_uid  TEXT        NOT NULL,
      author_name TEXT        NOT NULL DEFAULT '',
      title       TEXT        NOT NULL DEFAULT '',
      destination TEXT        NOT NULL DEFAULT '',
      score       NUMERIC     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_uid, trip_id)
    );

    CREATE INDEX IF NOT EXISTS feed_user_score_idx ON feed_entries (user_uid, score DESC, created_at DESC);

    CREATE TABLE IF NOT EXISTS newsletter_log (
      id          SERIAL      PRIMARY KEY,
      user_uid    TEXT        NOT NULL,
      entry_count INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
