"""Locust entry point for TravelManager load tests.

Run:
    locust -f locustfile.py --host http://localhost:3000

Switch target via --host flag — same file works against local docker-compose,
Cloud Run, and Compute Engine deployments.
"""
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))  # so scenarios can import auth

from scenarios.browsing import BrowsingUser  # noqa: E402,F401
from scenarios.authenticated import AuthedUser  # noqa: E402,F401
