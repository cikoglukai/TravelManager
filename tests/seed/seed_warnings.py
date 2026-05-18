"""Bulk-seed travel_warnings via COPY for scalability validation.

Usage:
    DATABASE_URL_TRAVEL_INFO=postgresql://... python tests/seed/seed_warnings.py --count 10000
"""
import argparse
import io
import json
import os
import random
import datetime as dt
import psycopg


COUNTRIES = ["FR", "DE", "IT", "ES", "JP", "US", "GB", "IN", "BR", "MX", "ID", "TR", "GR", "AU", "CN", "PH"]
SEVERITIES = ["info", "advisory", "warning", "danger", "extreme"]
SOURCES = ["gdacs", "reliefweb", "openweather"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--count", type=int, default=10_000)
    args = p.parse_args()

    url = os.environ["DATABASE_URL_TRAVEL_INFO"]
    buf = io.StringIO()
    now = dt.datetime.utcnow()
    for i in range(args.count):
        c = random.choice(COUNTRIES)
        s = random.choice(SEVERITIES)
        src = random.choice(SOURCES)
        valid_from = now - dt.timedelta(days=random.randint(0, 365))
        valid_to = valid_from + dt.timedelta(days=random.randint(1, 30))
        buf.write("\t".join([
            src, f"{src}-{i}", c, c, s,
            f"Synthetic warning {i}",
            valid_from.isoformat(), valid_to.isoformat(),
            json.dumps({"synthetic": True}),
        ]) + "\n")

    buf.seek(0)
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        with cur.copy(
            "COPY travel_warnings (source, source_id, country_iso2, region, severity, summary, valid_from, valid_to, raw_json) "
            "FROM STDIN"
        ) as cp:
            cp.write(buf.read())
        conn.commit()

    print(f"Seeded {args.count} warnings")


if __name__ == "__main__":
    main()
