"""Travel-warning ingest storm — bypasses scheduler by POSTing test ticks.

Forces travel-info to ingest + match against seeded active trips; measures end-to-end
notification fan-out latency. Gated by X-Test-Token so it can never run against prod.
"""
import os
import uuid
import datetime as dt

from locust import HttpUser, task, between


def envelope(extra):
    base = {
        "eventId":    str(uuid.uuid4()),
        "tenantId":   "system",
        "occurredAt": dt.datetime.utcnow().isoformat() + "Z",
        "version":    1,
    }
    base.update(extra)
    return base


class WarningStorm(HttpUser):
    wait_time = between(0.1, 0.5)

    def on_start(self):
        self.client.headers["x-test-token"] = os.environ.get("TEST_TOKEN", "")

    @task(3)
    def publish_warning(self):
        payload = envelope({
            "warningId": str(uuid.uuid4()),
            "country":   "FR",
            "region":    "Ile-de-France",
            "severity":  "warning",
            "validFrom": dt.datetime.utcnow().isoformat() + "Z",
            "validTo":   (dt.datetime.utcnow() + dt.timedelta(days=7)).isoformat() + "Z",
            "source":    "manual",
            "summary":   "Synthetic warning for load test",
        })
        self.client.post("/api/internal/test/publish-warning",
                         json=payload,
                         name="test publish-warning")

    @task(1)
    def read_alerts(self):
        self.client.get("/api/alerts/me", name="GET /api/alerts/me")
