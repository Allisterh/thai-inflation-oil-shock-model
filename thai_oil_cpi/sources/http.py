from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

from .. import config as C


class SourceError(RuntimeError):
    """A source could not be fetched or parsed."""


BROWSER_HEADERS = {
    "User-Agent": C.USER_AGENT,
    "Accept": "*/*",
    "Accept-Language": "th,en;q=0.8",
}


def get(url: str, headers: dict | None = None, retries: int = 2, backoff: float = 2.0, timeout: int = C.HTTP_TIMEOUT) -> bytes:
    hdrs = {**BROWSER_HEADERS, **(headers or {})}
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            last = exc
            if isinstance(exc, urllib.error.HTTPError) and exc.code in (400, 401, 403, 404):
                break
            if attempt < retries:
                time.sleep(backoff * (attempt + 1))
    raise SourceError(f"GET {url} failed: {last}")


def post_json(url: str, payload: dict, headers: dict | None = None, retries: int = 1, timeout: int = C.HTTP_TIMEOUT) -> bytes:
    hdrs = {**BROWSER_HEADERS, "Content-Type": "application/json", "Accept": "application/json", **(headers or {})}
    body = json.dumps(payload).encode()
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            last = exc
            if isinstance(exc, urllib.error.HTTPError) and exc.code in (400, 401, 403, 404):
                break
            if attempt < retries:
                time.sleep(2.0 * (attempt + 1))
    raise SourceError(f"POST {url} failed: {last}")
