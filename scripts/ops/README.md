# Ops scripts — async control mechanisms

## Pause / resume a worker

Hits the BFF admin API which scales a Deployment to 0/N. Pub/Sub buffers messages for 7 days while paused.

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"paused": true}' \
  https://travelmanager.app/api/admin/workers/notification/pause
```

Resume: `{"paused": false}`.

Helm value alternative (no API): set `worker.paused: true` in the per-tenant values file → `helm upgrade` → replicas=0.

## DLQ depth check

```bash
GOOGLE_CLOUD_PROJECT=travelmanager-prod ./scripts/ops/dlq_depth.sh
```

Prints depth per `.dlq.drain` subscription with ALERT marker above threshold (default 50; set `DLQ_ALERT_THRESHOLD`). Wired as a CronJob via `deploy/helm/dlq-monitor/`.

## Replay DLQ → source topic

```bash
GOOGLE_CLOUD_PROJECT=travelmanager-prod \
  ./scripts/ops/replay_dlq.sh notification.requested
```

Pulls all messages from `<topic>.dlq.drain`, ACKs them, re-publishes payload (and attributes) to `<topic>`. Idempotency on consumer side is responsible for dedupe via `eventId`.
