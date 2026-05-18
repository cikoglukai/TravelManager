"""1-hour sustained load shape — for SLO validation under steady high-traffic conditions."""
from locust import LoadTestShape


class SustainedShape(LoadTestShape):
    duration = 60 * 60       # 1 hour
    target_users = 500
    spawn_rate = 25

    def tick(self):
        run_time = self.get_run_time()
        if run_time > self.duration:
            return None
        return (self.target_users, self.spawn_rate)
