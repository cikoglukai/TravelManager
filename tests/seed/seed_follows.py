"""Bulk-seed follow graph with a power-law distribution.

Power-law makes the celebrity-account problem realistic: a few users have many followers,
most have few. avg = ~50, alpha = 2.5 by default.

Usage:
    DATABASE_URL_SOCIAL=postgresql://... \
    python tests/seed/seed_follows.py --users 100000 --avg-out 50
"""
import argparse
import io
import os
import random
import psycopg


def power_law_pick(n, alpha=2.5):
    # Higher rank -> exponentially less popular. r in [1, n].
    r = random.randint(1, n)
    return int(((random.random() ** -1.0) ** (1 / (alpha - 1))) % n) or r % n


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--users",   type=int, default=100_000)
    p.add_argument("--avg-out", type=int, default=50)
    p.add_argument("--tenant",  default="loadtest")
    args = p.parse_args()

    url = os.environ["DATABASE_URL_SOCIAL"]
    buf = io.StringIO()
    total = 0
    for u in range(1, args.users + 1):
        out = max(1, int(random.gauss(args.avg_out, args.avg_out / 4)))
        for _ in range(out):
            target = power_law_pick(args.users)
            if target == u:
                continue
            buf.write(f"u{u}\tu{target}\t{args.tenant}\n")
            total += 1

    buf.seek(0)
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        with cur.copy(
            "COPY follows (follower_uid, followee_uid, tenant_id) FROM STDIN"
        ) as cp:
            cp.write(buf.read())
        conn.commit()

    print(f"Seeded {total} follow edges over {args.users} users")


if __name__ == "__main__":
    main()
