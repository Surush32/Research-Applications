"""Simple HTTP cache client — another distinct corpus entry."""

import hashlib
import time
from typing import Any, Dict, Optional, Tuple


class CacheEntry:
    def __init__(self, value: Any, expires_at: float):
        self.value = value
        self.expires_at = expires_at

    def is_expired(self) -> bool:
        return time.time() >= self.expires_at


class HttpCacheClient:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl_seconds = ttl_seconds
        self._store: Dict[str, CacheEntry] = {}

    def _key(self, method: str, url: str) -> str:
        raw = f"{method.upper()}:{url}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, method: str, url: str) -> Optional[Any]:
        key = self._key(method, url)
        entry = self._store.get(key)
        if entry is None or entry.is_expired():
            self._store.pop(key, None)
            return None
        return entry.value

    def set(self, method: str, url: str, value: Any) -> None:
        key = self._key(method, url)
        self._store[key] = CacheEntry(value, time.time() + self.ttl_seconds)

    def request(self, method: str, url: str, fetcher) -> Tuple[Any, bool]:
        cached = self.get(method, url)
        if cached is not None:
            return cached, True
        value = fetcher(method, url)
        self.set(method, url, value)
        return value, False
