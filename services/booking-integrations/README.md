# booking-integrations service

RapidAPI proxies for flights (Skyscanner), hotels (Booking.com), buses (mock). Redis-backed cache replaces the in-memory Map of the monolith.

## Env

| var | required | example |
|---|---|---|
| `RAPIDAPI_KEY` | yes | RapidAPI subscription key |
| `REDIS_URL` | recommended | `redis://10.x.x.x:6379` (Memorystore private IP) |

If `REDIS_URL` is absent the service falls back to an in-process Map (dev only).

## Routes

| method | path | description |
|---|---|---|
| GET | `/api/health` | upstream creds + redis check |
| GET | `/api/flights?origin=&destination=&departureDate=` | top 5 itineraries |
| GET | `/api/hotels?city=&checkin=&checkout=` | top 5 hotels |
| GET | `/api/buses?origin=&destination=&departureDate=` | mock |

## Cache keys

- `sky:<city>`     — Skyscanner skyId+entityId, 24 h TTL, negative cache 10 min
- `booking:<city>` — Booking dest_id, same TTL policy
