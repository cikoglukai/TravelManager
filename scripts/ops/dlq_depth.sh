#!/usr/bin/env bash
# Print message backlog per DLQ subscription. Used by the dlq-monitor CronJob to alert when depths grow.
# Usage:
#   GOOGLE_CLOUD_PROJECT=... ./scripts/ops/dlq_depth.sh
# Threshold (alert above): DLQ_ALERT_THRESHOLD (default 50)

set -euo pipefail
PROJECT="${GOOGLE_CLOUD_PROJECT:?}"
THRESHOLD="${DLQ_ALERT_THRESHOLD:-50}"

gcloud pubsub subscriptions list --project="$PROJECT" --format="value(name)" \
  | grep '\.dlq\.drain$' | while read -r SUB; do
  NAME="${SUB##*/}"
  TOPIC="${NAME%.dlq.drain}"
  DEPTH="$(gcloud monitoring time-series list \
    --project="$PROJECT" \
    --filter="metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\" AND resource.label.subscription_id=\"$NAME\"" \
    --format="value(points[0].value.int64Value)" 2>/dev/null | head -1)"
  DEPTH="${DEPTH:-0}"
  STATUS="ok"
  [[ "$DEPTH" -gt "$THRESHOLD" ]] && STATUS="ALERT"
  printf "%-50s depth=%-6s [%s]\n" "$TOPIC" "$DEPTH" "$STATUS"
done
