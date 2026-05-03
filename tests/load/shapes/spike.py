"""Once-in-a-lifetime workload shape — Black-Friday-style spike.

Stages:
  0–60s    baseline 10 users
  60–90s   ramp 10 → 500 (spike)
  90–210s  hold 500
  210–270s drop 500 → 10
  270–330s baseline 10 users
Total: 5min 30s.
"""
from __future__ import annotations

from locust import LoadTestShape


class SpikeShape(LoadTestShape):
    stages = [
        {"end": 60,  "users": 10,  "spawn_rate": 5},
        {"end": 90,  "users": 500, "spawn_rate": 50},
        {"end": 210, "users": 500, "spawn_rate": 50},
        {"end": 270, "users": 10,  "spawn_rate": 50},
        {"end": 330, "users": 10,  "spawn_rate": 5},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["end"]:
                return (stage["users"], stage["spawn_rate"])
        return None
