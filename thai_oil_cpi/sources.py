"""Fetchers for the external series used by the model.

Every fetcher returns a pandas Series indexed by a DatetimeIndex (daily data)
or a monthly PeriodIndex (monthly data). Network failures raise
``SourceError`` so the sync layer can fall through to the next source.
"""
from __future__ import annotations

import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request

import pandas as pd

from .config import HTTP_TIMEOUT, USER_AGENT


class SourceError(RuntimeError):
    """Raised when a source cannot be fetched or parsed."""


def _get(url: str, retries: int = 2, backoff: float = 2.0) -> bytes:
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            last = exc
            if attempt < retries:
                time.sleep(backoff * (attempt + 1))
    raise SourceError(f"GET {url} failed: {last}")


# --------------------------------------------------------------------------
# Daily prices
# --------------------------------------------------------------------------
def fetch_yahoo_daily(symbol: str, start: str = "2007-01-01") -> pd.Series:
    """Daily closes from Yahoo Finance's chart endpoint (no API key needed).

    ``BZ=F`` is ICE Brent front-month futures, ``THB=X`` is USD/THB.
    """
    period1 = int(pd.Timestamp(start).timestamp())
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.parse.quote(symbol)}?period1={period1}&period2=9999999999&interval=1d"
    )
    raw = _get(url)
    try:
        payload = json.loads(raw)["chart"]
        if payload.get("error"):
            raise SourceError(f"Yahoo error for {symbol}: {payload['error']}")
        result = payload["result"][0]
        ts = result["timestamp"]
        closes = result["indicators"]["quote"][0]["close"]
        tz = result.get("meta", {}).get("exchangeTimezoneName", "UTC")
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise SourceError(f"Unexpected Yahoo payload for {symbol}: {exc}") from exc
    idx = (
        pd.to_datetime(ts, unit="s", utc=True)
        .tz_convert(tz)
        .normalize()
        .tz_localize(None)
    )
    s = pd.Series(closes, index=idx, dtype="float64").dropna()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    s.index.name = "date"
    if s.empty:
        raise SourceError(f"Yahoo returned no data for {symbol}")
    return s


def fetch_eia_brent_daily() -> pd.Series:
    """Europe Brent spot (FOB) daily, from EIA's public spreadsheet (no key)."""
    raw = _get("https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls")
    try:
        df = pd.read_excel(io.BytesIO(raw), sheet_name="Data 1", skiprows=2)
    except Exception as exc:  # xlrd / format problems
        raise SourceError(f"Could not parse EIA spreadsheet: {exc}") from exc
    df = df.iloc[:, :2]
    df.columns = ["date", "value"]
    s = pd.Series(pd.to_numeric(df["value"], errors="coerce").values,
                  index=pd.to_datetime(df["date"], errors="coerce")).dropna()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    s.index.name = "date"
    if s.empty:
        raise SourceError("EIA spreadsheet contained no observations")
    return s


def fetch_fred_csv(series_id: str) -> pd.Series:
    """Any FRED series via the public fredgraph CSV endpoint (no key)."""
    raw = _get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}")
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise SourceError(f"Could not parse FRED CSV for {series_id}: {exc}") from exc
    if df.shape[1] < 2:
        raise SourceError(f"FRED CSV for {series_id} has unexpected shape")
    date_col, val_col = df.columns[0], df.columns[1]
    s = pd.Series(pd.to_numeric(df[val_col], errors="coerce").values,
                  index=pd.to_datetime(df[date_col], errors="coerce")).dropna()
    s.index.name = "date"
    if s.empty:
        raise SourceError(f"FRED series {series_id} is empty")
    return s.sort_index()


# --------------------------------------------------------------------------
# Monthly CPI
# --------------------------------------------------------------------------
def fetch_dbnomics_series(provider: str, dataset: str, code: str) -> pd.Series:
    """A single DBnomics series (e.g. IMF/CPI/M.TH.PCPI_IX), monthly PeriodIndex."""
    url = (f"https://api.db.nomics.world/v22/series/{provider}/{dataset}/"
           f"{urllib.parse.quote(code)}?observations=1&format=json")
    raw = _get(url)
    try:
        doc = json.loads(raw)["series"]["docs"][0]
        periods, values = doc["period"], doc["value"]
    except (KeyError, IndexError, ValueError) as exc:
        raise SourceError(f"Unexpected DBnomics payload for {code}: {exc}") from exc
    s = pd.Series(pd.to_numeric(pd.Series(values), errors="coerce").values,
                  index=pd.PeriodIndex(periods, freq="M")).dropna()
    s.index.name = "month"
    if s.empty:
        raise SourceError(f"DBnomics series {code} is empty")
    return s.sort_index()


def fetch_csv_url_monthly(url: str) -> pd.Series:
    """Generic hook: any CSV with columns (date, value) where date is YYYY-MM.

    Lets a maintainer point ``THAI_CPI_URL`` at a feed they trust (for example a
    file exported from the Ministry of Commerce price index site).
    """
    raw = _get(url)
    df = pd.read_csv(io.BytesIO(raw))
    return monthly_series_from_frame(df)


def monthly_series_from_frame(df: pd.DataFrame) -> pd.Series:
    cols = {c.lower().strip(): c for c in df.columns}
    date_col = cols.get("date") or cols.get("month") or df.columns[0]
    val_col = cols.get("value") or cols.get("cpi") or cols.get("cpi_index") or df.columns[1]
    idx = pd.PeriodIndex(pd.to_datetime(df[date_col].astype(str), errors="coerce"), freq="M")
    s = pd.Series(pd.to_numeric(df[val_col], errors="coerce").values, index=idx).dropna()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    s.index.name = "month"
    return s
