"""Daily market data from Yahoo Finance's public chart endpoint (no key)."""
from __future__ import annotations

import json
import urllib.parse

import pandas as pd

from .http import SourceError, get


def fetch_daily(symbol: str, start: str = "2000-01-01") -> pd.Series:
    """Daily closes. ``BZ=F`` = ICE Brent front month, ``THB=X`` = USD/THB."""
    period1 = int(pd.Timestamp(start).timestamp())
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           f"{urllib.parse.quote(symbol)}?period1={period1}&period2=9999999999&interval=1d")
    raw = get(url)
    try:
        chart = json.loads(raw)["chart"]
        if chart.get("error"):
            raise SourceError(f"Yahoo error for {symbol}: {chart['error']}")
        res = chart["result"][0]
        ts, closes = res["timestamp"], res["indicators"]["quote"][0]["close"]
        tz = res.get("meta", {}).get("exchangeTimezoneName", "UTC")
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise SourceError(f"Unexpected Yahoo payload for {symbol}: {exc}") from exc
    idx = pd.to_datetime(ts, unit="s", utc=True).tz_convert(tz).normalize().tz_localize(None)
    s = pd.Series(closes, index=idx, dtype="float64").dropna()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    s.index.name = "date"
    if s.empty:
        raise SourceError(f"Yahoo returned no data for {symbol}")
    return s
