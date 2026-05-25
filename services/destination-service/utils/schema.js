// Destination DB schema. Owns destinations, routes, transport_options,
// accommodation_options. Static catalog data, seeded once on startup.
import { getDb } from '@travelmanager/shared/db'

export async function initDestinationDb() {
  const db = getDb()
  await db.query(`
    CREATE TABLE IF NOT EXISTS destinations (
      id          SERIAL PRIMARY KEY,
      country     TEXT NOT NULL,
      city        TEXT NOT NULL,
      emoji       TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      UNIQUE(country, city)
    );

    CREATE TABLE IF NOT EXISTS routes (
      id             SERIAL  PRIMARY KEY,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      description    TEXT    NOT NULL DEFAULT '',
      duration_days  INTEGER NOT NULL,
      highlights     TEXT    NOT NULL DEFAULT '',
      UNIQUE(destination_id, name)
    );

    CREATE TABLE IF NOT EXISTS transport_options (
      id         SERIAL  PRIMARY KEY,
      route_id   INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL,
      provider   TEXT    NOT NULL DEFAULT '',
      duration   TEXT    NOT NULL DEFAULT '',
      price_from INTEGER NOT NULL DEFAULT 0,
      notes      TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS accommodation_options (
      id              SERIAL    PRIMARY KEY,
      route_id        INTEGER   NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      type            TEXT      NOT NULL,
      name            TEXT      NOT NULL,
      price_per_night INTEGER   NOT NULL DEFAULT 0,
      rating          NUMERIC(2,1) NOT NULL DEFAULT 0,
      notes           TEXT      NOT NULL DEFAULT ''
    );
  `)
}
