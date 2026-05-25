"""Async-workload load test.

Floods the gateway with trip creates to stress the asynchronous pipeline:
  POST /api/trips  -> publishes TripCreated
                   -> Social feed builder fans out to followers
                   -> Travel Info diff engine matches against warnings
Reads /api/feed and /api/alerts to observe how fast the async results appear.

Runs against the gateway in skip-auth mode (GATEWAY_SKIP_AUTH=1): each virtual
user sends an `x-debug-uid` header instead of a Firebase JWT, so no Firebase
rate limits cap the throughput. This is what makes it suitable for measuring
worker/HPA scalability rather than auth overhead.

  locust -f async_flood.py --host http://localhost:8080 \
         --users 200 --spawn-rate 20 -t 5m --headless \
         --html reports/async_flood.html
"""
from __future__ import annotations

import random
from datetime import date, timedelta

from locust import HttpUser, between, task

CITIES = ["Paris", "Rome", "Berlin", "Vienna", "Lisbon", "Oslo", "Athens", "Madrid"]


def _trip_payload() -> dict:
    start = date.today() + timedelta(days=random.randint(7, 365))
    return {
        "title": f"Async Load Trip {random.randint(100000, 999999)}",
        "destination": random.choice(CITIES),
        "origin": random.choice(CITIES),
        "start_date": start.isoformat(),
        "short_description": "Synthetic async-pipeline load trip.",
        "detail_description": "Created by async_flood.py. Safe to delete.",
    }


class AsyncFloodUser(HttpUser):
    wait_time = between(0.1, 0.5)

    def on_start(self):
        # Stable per-VU identity for the whole run.
        self.uid = f"load_{random.randint(0, 10_000_000)}"
        self.headers = {"x-debug-uid": self.uid}
        # Upsert the user row so trip writes succeed.
        self.client.post("/api/users", json={"name": "Load User"}, headers=self.headers, name="POST /api/users")

    @task(5)
    def create_trip(self):
        self.client.post("/api/trips", json=_trip_payload(), headers=self.headers, name="POST /api/trips (TripCreated)")

    @task(2)
    def read_feed(self):
        self.client.get("/api/feed", headers=self.headers, name="GET /api/feed")

    @task(2)
    def read_alerts(self):
        self.client.get("/api/alerts", headers=self.headers, name="GET /api/alerts")

    @task(1)
    def browse_public(self):
        self.client.get("/api/trips/all", name="GET /api/trips/all")
