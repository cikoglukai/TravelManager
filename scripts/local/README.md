# Local microservices

## One-shot bring-up

```bash
docker compose up --build -d
```

Brings up:
- **postgres** on `127.0.0.1:5433`
- **redis** on `127.0.0.1:6380`
- **pubsub-emulator** on `127.0.0.1:8085` (auto-bootstrapped with all topics + DLQs)
- **bff-gateway** on `127.0.0.1:8090` — Nuxt SSR + edge proxy (UI entrypoint)
- **identity-tenant** on `127.0.0.1:8091`
- **trip** on `127.0.0.1:8092`
- **booking-integrations** on `127.0.0.1:8093`
- **social** on `127.0.0.1:8094`
- **travel-info** on `127.0.0.1:8095`
- **destination** on `127.0.0.1:8096`
- **notification** on `127.0.0.1:8097`

## Quick checks

```bash
# Health across services
for p in 8090 8091 8092 8093 8094 8095 8096 8097; do
  echo "Port $p:"; curl -s http://localhost:$p/api/health; echo
done

# UI
open http://localhost:8090

# Pub/Sub topology
curl http://localhost:8085/v1/projects/local-tm/topics
```

## Tear down

```bash
docker compose down
# add -v to also wipe postgres + redis volumes
```

## Auth

`SKIP_AUTH=1` is set on every microservice — Firebase JWT verification is bypassed locally. Tenant defaults to `dev` (Enterprise plan) so all plan-gated endpoints work without a sign-in flow.

## Pub/Sub from the host

```bash
export PUBSUB_EMULATOR_HOST=127.0.0.1:8085
export GOOGLE_CLOUD_PROJECT=local-tm
node -e "import('@google-cloud/pubsub').then(m => new m.PubSub().topic('trip.created').publishMessage({data: Buffer.from(JSON.stringify({eventId:'00000000-0000-0000-0000-000000000000',tenantId:'dev',occurredAt:new Date().toISOString(),version:1,tripId:1,userUid:'u1',destination:'Paris',startDate:'2025-06-01',endDate:'2025-06-07'}))}).then(console.log))"
```

## Test endpoints (gated by `TEST_TOKEN`)

```bash
# Synthetic travel warning
curl -X POST http://localhost:8095/api/internal/test/publish-warning \
  -H "content-type: application/json" -H "x-test-token: $TEST_TOKEN" \
  -d '{"warningId":"w1","country":"FR","severity":"warning","validFrom":"2025-06-01T00:00:00Z","validTo":"2025-06-08T00:00:00Z","source":"manual","summary":"Test","tenantId":"dev","occurredAt":"2025-06-01T00:00:00Z","eventId":"00000000-0000-0000-0000-000000000000","version":1}'

# Trigger newsletter run
curl -X POST http://localhost:8094/api/internal/test/run-newsletter \
  -H "content-type: application/json" -H "x-test-token: $TEST_TOKEN" \
  -d '{"tenantId":"dev","weekOf":"2025-06-02","eventId":"00000000-0000-0000-0000-000000000000","occurredAt":"2025-06-01T00:00:00Z","version":1}'
```
