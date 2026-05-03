#!/usr/bin/env bash
# Run identical headless load against all three configured targets.
# Reports land in reports/<target>_<shape>_<timestamp>/.
#
# Usage:
#   ./run_compare.sh [users] [spawn-rate] [run-time] [shape]
# Defaults: 100 users, 10 spawn-rate, 5m run-time, flat shape
#
# Shapes:
#   flat       — constant --users / --spawn-rate (default)
#   periodic   — repeating ramp-up / ramp-down (Ex5 "Periodic Workload"; ignores users/spawn args)
#   spike      — once-in-a-lifetime burst (Ex5 "Once-in-a-lifetime"; ignores users/spawn/run-time args)

set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then set -a; source .env; set +a; fi

USERS="${1:-100}"
SPAWN="${2:-10}"
DURATION="${3:-5m}"
SHAPE="${4:-flat}"
TS="$(date +%Y%m%d_%H%M%S)"

case "$SHAPE" in
  flat|periodic|spike) ;;
  *) echo "Unknown shape: $SHAPE (use flat|periodic|spike)" >&2; exit 1 ;;
esac

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

  outdir="reports/${name}_${SHAPE}_${TS}"
  mkdir -p "$outdir"
  echo
  echo "=== Running against $name ($url) [shape=$SHAPE] ==="

  if [[ "$SHAPE" == "flat" ]]; then
    echo "    users=$USERS spawn=$SPAWN time=$DURATION → $outdir"
    echo
    locust -f locustfile.py --host "$url" \
      --users "$USERS" --spawn-rate "$SPAWN" --run-time "$DURATION" \
      --headless \
      --html "$outdir/report.html" \
      --csv "$outdir/stats" \
      --logfile "$outdir/locust.log" \
      --loglevel INFO || echo "[warn] $name run had failures (see $outdir/locust.log)"
  else
    # Shape classes drive user count themselves; --run-time still acts as upper bound.
    echo "    LOCUST_SHAPE=$SHAPE → $outdir"
    echo
    LOCUST_SHAPE="$SHAPE" locust -f locustfile.py --host "$url" \
      --headless \
      --html "$outdir/report.html" \
      --csv "$outdir/stats" \
      --logfile "$outdir/locust.log" \
      --loglevel INFO || echo "[warn] $name run had failures (see $outdir/locust.log)"
  fi
done

echo
echo "Done. Compare reports in reports/*_${SHAPE}_${TS}/"
