"""Bulk test-data generator for async scalability validation.

Creates N trips across M synthetic users through the gateway (skip-auth mode),
producing a large TripCreated event volume so the Social feed builder and
Travel Info diff engine can be measured against a realistic backlog.

  python seed_bulk_trips.py --host http://localhost:8080 --users 500 --trips 5000
"""
from __future__ import annotations

import argparse
import random
from datetime import date, timedelta

import requests

CITIES = ["Paris", "Rome", "Berlin", "Vienna", "Lisbon", "Oslo", "Athens", "Madrid", "Prague", "Zurich"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="http://localhost:8080")
    ap.add_argument("--users", type=int, default=500)
    ap.add_argument("--trips", type=int, default=5000)
    args = ap.parse_args()

    uids = [f"seed_{i}" for i in range(args.users)]
    for uid in uids:
        requests.post(f"{args.host}/api/users", json={"name": f"Seed {uid}"}, headers={"x-debug-uid": uid})

    made = 0
    for _ in range(args.trips):
        uid = random.choice(uids)
        start = date.today() + timedelta(days=random.randint(1, 400))
        payload = {
            "title": f"Seed Trip {random.randint(100000, 999999)}",
            "destination": random.choice(CITIES),
            "origin": random.choice(CITIES),
            "start_date": start.isoformat(),
            "short_description": "Bulk seed trip for scalability tests.",
        }
        r = requests.post(f"{args.host}/api/trips", json=payload, headers={"x-debug-uid": uid})
        if r.ok:
            made += 1
        if made % 500 == 0 and made:
            print(f"  created {made}/{args.trips} trips")

    print(f"Done: {made} trips across {args.users} users.")


if __name__ == "__main__":
    main()
