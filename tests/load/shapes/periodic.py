"""Periodic workload shape — simulates business-hours load.

Four cycles of: ramp up → hold high → ramp down → hold low.
Each cycle: 4 minutes. Total run: 16 minutes.
"""
from __future__ import annotations

from locust import LoadTestShape


class PeriodicShape(LoadTestShape):
    """Repeating sine-like step pattern — exercises autoscaling cooldown."""

    cycle_duration = 240  # 4 min per cycle
    cycles = 4
    peak_users = 100
    trough_users = 20
    spawn_rate = 10

    def tick(self):
        run_time = self.get_run_time()
        if run_time >= self.cycle_duration * self.cycles:
            return None

        phase = run_time % self.cycle_duration
        # 0–60s   ramp 0 → peak
        # 60–120s hold peak
        # 120–180s drop peak → trough
        # 180–240s hold trough
        if phase < 60:
            users = int(self.trough_users + (self.peak_users - self.trough_users) * (phase / 60))
        elif phase < 120:
            users = self.peak_users
        elif phase < 180:
            users = int(self.peak_users - (self.peak_users - self.trough_users) * ((phase - 120) / 60))
        else:
            users = self.trough_users

        return (users, self.spawn_rate)
