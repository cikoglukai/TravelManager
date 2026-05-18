"""Anonymous browsing — public read endpoints only."""
from __future__ import annotations

import random

from locust import HttpUser, between, task


class BrowsingUser(HttpUser):
    """Unauthenticated visitor browsing public trip feed."""

    weight = 3
    wait_time = between(1, 4)

    trip_ids: list[int] = []
    destination_ids: list[int] = []

    def on_start(self) -> None:
        with self.client.get("/api/trips/all", name="/api/trips/all", catch_response=True) as r:
            if r.ok:
                try:
                    self.trip_ids = [t["id"] for t in r.json() if "id" in t]
                except (ValueError, TypeError):
                    pass
        with self.client.get("/api/destinations", name="/api/destinations", catch_response=True) as r:
            if r.ok:
                try:
                    self.destination_ids = [d["id"] for d in r.json() if "id" in d]
                except (ValueError, TypeError):
                    pass

    @task(5)
    def list_trips(self) -> None:
        self.client.get("/api/trips/all", name="/api/trips/all")

    @task(2)
    def search_trips(self) -> None:
        q = random.choice(["paris", "rome", "berlin", "barcelona", "amsterdam"])
        self.client.get(f"/api/trips/all?q={q}", name="/api/trips/all?q=[search]")

    @task(3)
    def list_destinations(self) -> None:
        self.client.get("/api/destinations", name="/api/destinations")

    @task(1)
    def destination_routes(self) -> None:
        if not self.destination_ids:
            return
        d_id = random.choice(self.destination_ids)
        self.client.get(f"/api/destinations/{d_id}/routes", name="/api/destinations/[id]/routes")

    @task(2)
    def trip_likes(self) -> None:
        if not self.trip_ids:
            return
        t_id = random.choice(self.trip_ids)
        self.client.get(f"/api/likes/trip/{t_id}", name="/api/likes/trip/[id] (GET)")
