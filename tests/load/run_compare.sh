#!/usr/bin/env bash
# Run identical headless load against all three configured targets.
# Reports land in reports/<target>_<timestamp>/.
#
# Usage:
#   ./run_compare.sh [users] [spawn-rate] [run-time]
# Defaults: 100 users, 10 spawn-rate, 5m run-time

set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then set -a; source .env; set +a; fi

USERS="${1:-100}"
SPAWN="${2:-10}"
DURATION="${3:-5m}"
TS="$(date +%Y%m%d_%H%M%S)"

declare -A TARGETS=(
  [local]="${TARGET_LOCAL:-}"
  [cloud_run]="${TARGET_CLOUD_RUN:-}"
  [gce]="${TARGET_GCE:-}"
)

for name in "${!TARGETS[@]}"; do
  url="${TARGETS[$name]}"
  if [[ -z "$url" ]]; then
    echo "[skip] $name — TARGET_${name^^} not set in .env"
    continue
  fi

  outdir="reports/${name}_${TS}"
  mkdir -p "$outdir"
  echo
  echo "=== Running against $name ($url) ==="
  echo "    users=$USERS spawn=$SPAWN time=$DURATION → $outdir"
  echo

  locust -f locustfile.py --host "$url" \
    --users "$USERS" --spawn-rate "$SPAWN" --run-time "$DURATION" \
    --headless \
    --html "$outdir/report.html" \
    --csv "$outdir/stats" \
    --logfile "$outdir/locust.log" \
    --loglevel INFO || echo "[warn] $name run had failures (see $outdir/locust.log)"
done

echo
echo "Done. Compare reports in reports/*_${TS}/"
