"""Feed-heavy social user — 90% reads against /api/feed, 10% likes.

Exercises social service fan-out + Firestore read path; combine with seeded follow graph
(tests/seed/seed_follows.py) to validate per-user feed read p95 under 1M users / 50 follows avg.
"""
from locust import HttpUser, task, between
from auth import get_id_token  # existing helper that mints a Firebase ID token


class FeedUser(HttpUser):
    wait_time = between(0.5, 2)

    def on_start(self):
        self._token = get_id_token(self.environment)
        self.client.headers["authorization"] = f"Bearer {self._token}"

    @task(9)
    def read_feed(self):
        self.client.get("/api/feed", name="GET /api/feed")

    @task(1)
    def like_random_trip(self):
        # Like trip #1 — replace with a randomized id from seed data when available.
        self.client.post("/api/likes/trip/1",
                         json={"comment": "looks great"},
                         name="POST /api/likes/trip/:id")
