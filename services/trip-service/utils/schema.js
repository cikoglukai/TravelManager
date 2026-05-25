// Trip DB schema. Owns trips, plan_locations, reviews and travel_plans.
//
// DB-per-service: there is no users table here, so the old hard FKs to
// users(firebase_uid) are gone. Author/reviewer display names are denormalised
// (captured from the gateway identity at write time) so the hot read paths
// (trips/all, reviews list) never need a cross-service join. travel_plans keeps
// destination/route/option IDs but does NOT FK them — template plans are
// hydrated by calling the Destination service over HTTP.
import { getDb } from '@travelmanager/shared/db'

export async function initTripDb() {
  const db = getDb()

  await db.query(`
    CREATE TABLE IF NOT EXISTS trips (
      id                  SERIAL      PRIMARY KEY,
      user_uid            TEXT        NOT NULL,
      author_name         TEXT        NOT NULL DEFAULT '',
      title               TEXT        NOT NULL,
      destination         TEXT        NOT NULL,
      origin              TEXT        NOT NULL DEFAULT '',
      start_date          TEXT        NOT NULL,
      short_description   TEXT        NOT NULL,
      detail_description  TEXT        NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS trips_user_uid_idx ON trips (user_uid);

    CREATE TABLE IF NOT EXISTS plan_locations (
      id          SERIAL      PRIMARY KEY,
      trip_id     INTEGER     NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      name        TEXT        NOT NULL,
      description TEXT        NOT NULL DEFAULT '',
      image_url   TEXT        NOT NULL DEFAULT '',
      date_from   DATE,
      date_to     DATE,
      position    INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id            SERIAL      PRIMARY KEY,
      trip_id       INTEGER     NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      reviewer_id   TEXT        NOT NULL,
      reviewer_name TEXT        NOT NULL DEFAULT '',
      stars         INTEGER     NOT NULL CHECK (stars BETWEEN 1 AND 5),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(trip_id, reviewer_id)
    );

    CREATE TABLE IF NOT EXISTS travel_plans (
      id                      SERIAL  PRIMARY KEY,
      trip_id                 INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
      mode                    TEXT    NOT NULL DEFAULT 'template',
      destination_id          INTEGER,
      route_id                INTEGER,
      transport_option_id     INTEGER,
      accommodation_option_id INTEGER,
      notes                   TEXT    NOT NULL DEFAULT '',
      custom_destination                   TEXT,
      custom_route_name                    TEXT,
      custom_route_description             TEXT,
      custom_duration_days                 INTEGER,
      custom_highlights                    TEXT,
      custom_transport_type                TEXT,
      custom_transport_provider            TEXT,
      custom_transport_duration            TEXT,
      custom_transport_price_from          INTEGER,
      custom_transport_notes               TEXT,
      custom_accommodation_type            TEXT,
      custom_accommodation_name            TEXT,
      custom_accommodation_price_per_night INTEGER,
      custom_accommodation_rating          NUMERIC(2,1),
      custom_accommodation_notes           TEXT,
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
