"""Firebase REST sign-in helpers for Locust virtual users."""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import requests

SIGN_IN_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
REFRESH_URL = "https://securetoken.googleapis.com/v1/token"

# Firebase ID tokens are valid for 1h. Refresh 5min before expiry.
TOKEN_TTL = 3600
REFRESH_MARGIN = 300


@dataclass
class FirebaseSession:
    id_token: str
    refresh_token: str
    uid: str
    api_key: str
    expires_at: float

    @property
    def expired(self) -> bool:
        return time.time() >= self.expires_at - REFRESH_MARGIN

    def authorization_header(self) -> str:
        return f"Bearer {self.id_token}"

    def refresh(self) -> None:
        r = requests.post(
            REFRESH_URL,
            params={"key": self.api_key},
            data={"grant_type": "refresh_token", "refresh_token": self.refresh_token},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        self.id_token = data["id_token"]
        self.refresh_token = data["refresh_token"]
        self.expires_at = time.time() + int(data.get("expires_in", TOKEN_TTL))


def sign_in(email: str, password: str, api_key: str) -> FirebaseSession:
    r = requests.post(
        SIGN_IN_URL,
        params={"key": api_key},
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    return FirebaseSession(
        id_token=data["idToken"],
        refresh_token=data["refreshToken"],
        uid=data["localId"],
        api_key=api_key,
        expires_at=time.time() + int(data.get("expiresIn", TOKEN_TTL)),
    )
