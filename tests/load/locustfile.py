"""Locust entry point for TravelManager load tests.

Run:
    locust -f locustfile.py --host http://localhost:3000

Switch target via --host flag — same file works against local docker-compose,
Cloud Run, and Compute Engine deployments.

Workload shape selection:
    LOCUST_SHAPE=periodic locust -f locustfile.py --host ...   # business-hours pattern
    LOCUST_SHAPE=spike    locust -f locustfile.py --host ...   # once-in-a-lifetime burst
    locust -f locustfile.py --host ...                         # flat (default; use --users/--spawn-rate)
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))  # so scenarios can import auth

from scenarios.browsing import BrowsingUser  # noqa: E402,F401
from scenarios.authenticated import AuthedUser  # noqa: E402,F401

_shape = os.environ.get("LOCUST_SHAPE", "").strip().lower()
if _shape == "periodic":
    from shapes.periodic import PeriodicShape  # noqa: E402,F401
elif _shape == "spike":
    from shapes.spike import SpikeShape  # noqa: E402,F401
elif _shape:
    raise RuntimeError(f"Unknown LOCUST_SHAPE={_shape!r}. Use 'periodic', 'spike', or unset.")
