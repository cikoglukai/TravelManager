#!/usr/bin/env bash
set -euo pipefail
HOST="https://onecloudaway.de"
ulimit -n 65535

case "${1:-}" in
  spike)
    SPIKE_PEAK=2000 LOCUST_SHAPE=spike locust -f locustfile.py --host "$HOST" \
      --headless --run-time 6m \
      --html reports/stress2000_caas.html \
      --csv reports/stress2000_caas \
      --logfile reports/stress2000_caas.log --loglevel INFO
    ;;
  periodic)
    PERIODIC_PEAK=2000 LOCUST_SHAPE=periodic locust -f locustfile.py --host "$HOST" \
      --headless --run-time 17m \
      --html reports/periodic2000_caas.html \
      --csv reports/periodic2000_caas \
      --logfile reports/periodic2000_caas.log --loglevel INFO
    ;;
  *) echo "usage: $0 spike|periodic" >&2; exit 1 ;;
esac
