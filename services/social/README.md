# social service

Owns: follow graph (PG), Firestore feed items, likes, reviews, weekly newsletter generation.

## Routes

| method | path |
|---|---|
| GET    | `/api/health` |
| GET    | `/api/feed` — last 20 items for the current user, Firestore-backed |
| POST   | `/api/follows/:uid` |
| DELETE | `/api/follows/:uid` |
| GET    | `/api/likes/trip/:tripId` |
| POST   | `/api/likes/trip/:tripId` (emits `social.activity`) |
| DELETE | `/api/likes/trip/:tripId` |
| POST   | `/api/internal/pubsub/social/feed-fanout` (consumes `trip.*` + `social.activity`) |
| POST   | `/api/internal/pubsub/social/newsletter` (consumes `newsletter.scheduled`, emits `notification.requested`) |
| POST   | `/api/internal/pubsub/social/feed-cleanup` (consumes `social.feed.cleanup.tick`, prunes expired feed items) |

## Tables

- `follows (follower_uid, followee_uid PK, tenant_id, created_at)`
- `social_activities (event_id UNIQUE, actor_uid, verb, object_id)` — denormalized activity log for newsletter
- `newsletter_runs (tenant_id, week_of UNIQUE)` — bookkeeping

## Firestore

```
feeds/{userUid}/items/{eventId}     # cap 500, _expiresAt 90d
likes/{tripId}/users/{uid}
reviews/{tripId}/users/{uid}
```

## Env

| var | required | example |
|---|---|---|
| `DATABASE_URL_SOCIAL` | yes | per-service DB |
| `GOOGLE_CLOUD_PROJECT` | yes | Firestore + Pub/Sub |
| `FIREBASE_SERVICE_ACCOUNT` | dev only | inline JSON SA |
| `SKIP_FIRESTORE` | dev | `1` to use stub |
