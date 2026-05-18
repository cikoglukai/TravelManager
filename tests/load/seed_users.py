"""Seed N Firebase Auth test users for load testing.

Run once per Firebase project. Writes seeded_users.json consumed by locustfile.
Idempotent: re-running skips existing accounts.

Usage:
    python seed_users.py            # create
    python seed_users.py --cleanup  # delete all seeded accounts
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
USER_COUNT = int(os.environ.get("TEST_USER_COUNT", "50"))
PASSWORD = os.environ.get("TEST_USER_PASSWORD", "LoadTest!2026")
EMAIL_DOMAIN = os.environ.get("TEST_USER_EMAIL_DOMAIN", "travelmanager.test")
SEEDED_FILE = ROOT / "seeded_users.json"


def init_admin() -> None:
    if firebase_admin._apps:
        return
    project_id = os.environ.get("NUXT_PUBLIC_FIREBASE_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT")

    if SERVICE_ACCOUNT_PATH:
        sa_path = Path(SERVICE_ACCOUNT_PATH)
        if not sa_path.is_absolute():
            sa_path = ROOT / sa_path
        if sa_path.is_file():
            firebase_admin.initialize_app(credentials.Certificate(str(sa_path)))
            return

    # Fallback: Application Default Credentials (gcloud auth application-default login)
    # Use this when org policy blocks service-account key creation.
    try:
        opts = {"projectId": project_id} if project_id else None
        firebase_admin.initialize_app(credentials.ApplicationDefault(), opts)
        print(f"[i] Using Application Default Credentials (project={project_id or 'auto'})")
    except Exception as e:
        sys.exit(
            f"No credentials found.\n"
            f"  - Service account JSON not at {sa_path}\n"
            f"  - ADC init failed: {e}\n"
            f"Fix: run `gcloud auth application-default login` "
            f"and `gcloud config set project <PROJECT_ID>`, "
            f"or set FIREBASE_SERVICE_ACCOUNT_PATH to a valid JSON path."
        )


def email_for(i: int) -> str:
    return f"loadtest-{i:04d}@{EMAIL_DOMAIN}"


def seed() -> None:
    init_admin()
    seeded: list[dict] = []
    for i in range(USER_COUNT):
        email = email_for(i)
        try:
            user = auth.create_user(email=email, password=PASSWORD, display_name=f"LoadTest User {i}")
            seeded.append({"uid": user.uid, "email": email})
            print(f"[+] created {email}")
        except auth.EmailAlreadyExistsError:
            user = auth.get_user_by_email(email)
            seeded.append({"uid": user.uid, "email": email})
            print(f"[=] exists  {email}")
    SEEDED_FILE.write_text(json.dumps(seeded, indent=2))
    print(f"\nWrote {len(seeded)} users to {SEEDED_FILE}")


def cleanup() -> None:
    init_admin()
    if not SEEDED_FILE.exists():
        # Fall back to listing by email pattern
        print(f"{SEEDED_FILE} missing; scanning Firebase for {EMAIL_DOMAIN} accounts...")
        page = auth.list_users()
        deleted = 0
        while page:
            for u in page.users:
                if u.email and u.email.endswith(f"@{EMAIL_DOMAIN}"):
                    auth.delete_user(u.uid)
                    deleted += 1
                    print(f"[-] deleted {u.email}")
            page = page.get_next_page()
        print(f"Deleted {deleted} accounts.")
        return

    seeded = json.loads(SEEDED_FILE.read_text())
    deleted = 0
    for entry in seeded:
        try:
            auth.delete_user(entry["uid"])
            deleted += 1
            print(f"[-] deleted {entry['email']}")
        except auth.UserNotFoundError:
            print(f"[?] missing {entry['email']}")
    SEEDED_FILE.unlink(missing_ok=True)
    print(f"\nDeleted {deleted} accounts. Removed {SEEDED_FILE.name}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cleanup", action="store_true", help="Delete all seeded users")
    args = parser.parse_args()
    cleanup() if args.cleanup else seed()
