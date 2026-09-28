"""Small in-memory, per-process rate limiting for public endpoints.

A sliding-window counter per client IP, guarded by a lock (FastAPI runs sync
endpoints in a thread pool). It lives in this process's memory, which is fine
for a single Railway instance; several instances would each count separately
and would need a shared store (e.g. Redis) instead.
"""

import ipaddress
import math
import threading
import time
from collections import OrderedDict, deque
from typing import Callable

from fastapi import HTTPException, Request, status

from .config import settings


class SlidingWindowRateLimiter:
    """Allow at most ``max_requests`` per ``window_seconds`` for each key.

    Keys are kept in least-recently-used order; idle keys are evicted as new
    requests arrive, and at most ``max_keys`` keys are ever stored, so memory
    stays bounded even when many different IPs call the endpoint.
    """

    def __init__(self, max_requests: int, window_seconds: float, max_keys: int = 10_000) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self.max_keys = max_keys
        self._hits: "OrderedDict[str, deque[float]]" = OrderedDict()
        self._lock = threading.Lock()

    def hit(self, key: str) -> float | None:
        """Record a request for ``key``. Returns None if allowed, else seconds until a slot frees up."""
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            self._evict_idle(cutoff)
            hits = self._hits.get(key)
            if hits is None:
                hits = deque()
                self._hits[key] = hits
            else:
                self._hits.move_to_end(key)
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return max(hits[0] + self.window - now, 0.0)
            hits.append(now)
            while len(self._hits) > self.max_keys:
                self._hits.popitem(last=False)
            return None

    def retry_after(self, key: str) -> float | None:
        """Like hit() but without recording: None if ``key`` still has room, else seconds to wait."""
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            self._evict_idle(cutoff)
            hits = self._hits.get(key)
            if not hits:
                return None
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return max(hits[0] + self.window - now, 0.0)
            return None

    def record(self, key: str) -> None:
        """Count one event for ``key`` (e.g. a failed login) without checking the limit."""
        now = time.monotonic()
        with self._lock:
            self._evict_idle(now - self.window)
            hits = self._hits.setdefault(key, deque())
            self._hits.move_to_end(key)
            hits.append(now)
            while len(self._hits) > self.max_keys:
                self._hits.popitem(last=False)

    def _evict_idle(self, cutoff: float) -> None:
        # Oldest-used keys come first; stop at the first one that is still active.
        while self._hits:
            _, hits = next(iter(self._hits.items()))
            if hits and hits[-1] > cutoff:
                break
            self._hits.popitem(last=False)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request) -> str:
    """The client IP used as the rate-limit key.

    With TRUST_PROXY_HEADERS (Railway): the right-most X-Forwarded-For entry,
    i.e. the address Railway's edge proxy itself saw. Entries further left can
    be sent by the client and are never trusted. Otherwise (local dev, direct
    connections): the TCP peer address.
    """
    if settings.trust_proxy_headers:
        entries = [e.strip() for e in ",".join(request.headers.getlist("x-forwarded-for")).split(",") if e.strip()]
        if entries:
            candidate = entries[-1]
            try:
                return str(ipaddress.ip_address(candidate))
            except ValueError:
                pass
    return request.client.host if request.client else "unknown"


def too_many_requests(detail: str, retry_after: float) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=detail,
        headers={"Retry-After": str(max(1, math.ceil(retry_after)))},
    )


def rate_limit(
    limiter: SlidingWindowRateLimiter, detail: str, exempt_admin: bool = False
) -> Callable[[Request], None]:
    """FastAPI dependency: 429 with Retry-After once a client IP exceeds ``limiter``.

    With ``exempt_admin``, requests carrying a valid admin bearer token aren't
    counted (the admin panel's "Enroll this student" calls POST /enrollments
    from the Next.js server, so all of those share that server's IP).
    """

    def dependency(request: Request) -> None:
        if exempt_admin and _has_valid_admin_token(request):
            return
        retry_after = limiter.hit(client_ip(request))
        if retry_after is not None:
            raise too_many_requests(detail, retry_after)

    return dependency


def _has_valid_admin_token(request: Request) -> bool:
    from .auth import decode_access_token  # local import: auth ↔ rate_limit stay independent

    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return False
    try:
        decode_access_token(token)
        return True
    except HTTPException:
        return False
