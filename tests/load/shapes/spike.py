"""Once-in-a-lifetime workload shape — Black-Friday-style spike.

Stages:
  0–60s    baseline 10 users
  60–90s   ramp 10 → PEAK (spike)
  90–210s  hold PEAK
  210–270s drop PEAK → 10
  270–330s baseline 10 users
Total: 5min 30s.

Peak overridable via SPIKE_PEAK env var (default 500). Spawn rate scales with peak.
"""
from __future__ import annotations

import os

from locust import LoadTestShape


_PEAK = int(os.environ.get("SPIKE_PEAK", "500"))
_SPAWN = max(50, _PEAK // 10)


class SpikeShape(LoadTestShape):
    stages = [
        {"end": 60,  "users": 10,    "spawn_rate": 5},
        {"end": 90,  "users": _PEAK, "spawn_rate": _SPAWN},
        {"end": 210, "users": _PEAK, "spawn_rate": _SPAWN},
        {"end": 270, "users": 10,    "spawn_rate": _SPAWN},
        {"end": 330, "users": 10,    "spawn_rate": 5},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["end"]:
                return (stage["users"], stage["spawn_rate"])
        return None
