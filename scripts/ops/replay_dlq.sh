#!/usr/bin/env bash
# Pull all messages from a DLQ and re-publish them to the source topic. Usage:
#   ./scripts/ops/replay_dlq.sh <topic-name>
# Example:
#   ./scripts/ops/replay_dlq.sh notification.requested
#
# Reads from <topic>.dlq.drain subscription, ACKs each, publishes payload back to <topic>.
# Requires gcloud auth + GOOGLE_CLOUD_PROJECT in env.

set -euo pipefail
TOPIC="${1:-}"
if [[ -z "$TOPIC" ]]; then
  echo "Usage: $0 <topic-name>" >&2
  exit 1
fi
PROJECT="${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT not set}"
DLQ_SUB="${TOPIC}.dlq.drain"

echo "[replay] Pulling from $DLQ_SUB → $TOPIC"
while true; do
  RESP="$(gcloud pubsub subscriptions pull "$DLQ_SUB" \
    --project="$PROJECT" --format=json --limit=10 --auto-ack || true)"
  COUNT="$(echo "$RESP" | jq 'length')"
  if [[ "$COUNT" == "0" ]]; then
    echo "[replay] DLQ empty"
    break
  fi
  echo "$RESP" | jq -c '.[]' | while read -r MSG; do
    DATA="$(echo "$MSG" | jq -r '.message.data')"
    ATTRS="$(echo "$MSG" | jq -c '.message.attributes // {}')"
    DECODED="$(echo "$DATA" | base64 -d)"
    echo "[replay] re-publishing eventId=$(echo "$DECODED" | jq -r '.eventId // "?"')"
    gcloud pubsub topics publish "$TOPIC" \
      --project="$PROJECT" \
      --message="$DECODED" \
      --attribute="$(echo "$ATTRS" | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')" \
      >/dev/null
  done
done
