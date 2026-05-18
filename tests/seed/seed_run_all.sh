#!/usr/bin/env bash
# Orchestrator for all seeders. Pick a profile: small / medium / large.

set -euo pipefail
PROFILE="${1:---profile=small}"
PROFILE="${PROFILE#--profile=}"

case "$PROFILE" in
  small)  USERS=10000;  TRIPS=2000;   WARNINGS=500;   FOLLOWS_AVG=20 ;;
  medium) USERS=100000; TRIPS=50000;  WARNINGS=10000; FOLLOWS_AVG=50 ;;
  large)  USERS=1000000; TRIPS=500000; WARNINGS=50000; FOLLOWS_AVG=50 ;;
  *)      echo "Unknown profile: $PROFILE (use small|medium|large)"; exit 1 ;;
esac

echo "[seed] profile=$PROFILE users=$USERS trips=$TRIPS warnings=$WARNINGS"

cd "$(dirname "$0")/.."

# Users + trips already covered by existing tests/load/seed_users.py + seed_trips.py
python load/seed_users.py --scale "$USERS"
python load/seed_trips.py --scale "$TRIPS"

python seed/seed_warnings.py --count "$WARNINGS"
python seed/seed_follows.py --users "$USERS" --avg-out "$FOLLOWS_AVG"

echo "[seed] done."
