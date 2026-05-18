# destination service

Owns destination catalog (cities, routes, transport, accommodation), products for sale at destination, and B2B marketing insights API for destination owners.

## Routes

| method | path | plan |
|---|---|---|
| GET | `/api/health` | — |
| GET | `/api/destinations` | free |
| GET | `/api/destinations/:id` | free |
| POST | `/api/destinations/:id/products` | standard |
| GET | `/api/destinations/:id/products` | free |
| GET | `/api/b2b/destinations/:id/insights` | enterprise + role `destination_manager` |
| POST | `/api/internal/pubsub/destination/aggregate` (consumes `trip.created`) | — |

## Tables

- `destinations`, `routes`, `transport_options`, `accommodation_options`
- `products` — sellable services at the destination
- `traveler_aggregates (destination_id, period, agg_json)` — month buckets, populated by `trip.created` consumer

## k-anonymity

B2B insights drop any bucket whose count is less than k=10 — protects individual user data while exposing aggregate trends.
