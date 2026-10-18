"""European Central Bank reference rates via the open Frankfurter API (no key, free to republish).

USD/THB is derived from the ECB's EUR fixings (THB per EUR ÷ USD per EUR), published every TARGET
business day around 16:00 CET. Coverage starts in 1999.
"""
from __future__ import annotations

import json

import pandas as pd

from .http import SourceError, get


def fetch_usdthb_daily(start: str = "2000-01-01") -> pd.Series:
    url = f"https://api.frankfurter.dev/v1/{start}..?base=USD&symbols=THB"
    raw = get(url, timeout=180)
    try:
        rates = json.loads(raw)["rates"]
    except (KeyError, ValueError) as exc:
        raise SourceError(f"Unexpected Frankfurter payload: {exc}") from exc
    s = pd.Series({pd.Timestamp(d): float(v["THB"]) for d, v in rates.items() if "THB" in v}).sort_index()
    s.index.name = "date"
    if s.empty:
        raise SourceError("Frankfurter returned no THB rates")
    return s
