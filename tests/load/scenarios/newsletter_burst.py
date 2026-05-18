"""Trigger a synthetic newsletter run for a 100k-user tenant.

Measures completion time end-to-end (Pub/Sub publish -> social newsletter worker ->
notification.requested fan-out -> SendGrid throttle).
"""
import os
import uuid
import datetime as dt

from locust import HttpUser, task, between


class NewsletterBurst(HttpUser):
    wait_time = between(60, 120)

    def on_start(self):
        self.client.headers["x-test-token"] = os.environ.get("TEST_TOKEN", "")

    @task
    def trigger_newsletter(self):
        payload = {
            "eventId":   str(uuid.uuid4()),
            "tenantId":  os.environ.get("LOAD_TENANT", "loadtest"),
            "occurredAt": dt.datetime.utcnow().isoformat() + "Z",
            "version":    1,
            "weekOf":     dt.date.today().isoformat(),
        }
        self.client.post("/api/internal/test/run-newsletter",
                         json=payload, name="test run-newsletter")
