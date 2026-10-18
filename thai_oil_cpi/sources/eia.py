"""US Energy Information Administration: Europe Brent spot FOB, daily (public spreadsheet, no key)."""
from __future__ import annotations

import io

import pandas as pd

from .http import SourceError, get


def fetch_brent_daily() -> pd.Series:
    raw = get("https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls", timeout=120)
    try:
        df = pd.read_excel(io.BytesIO(raw), sheet_name="Data 1", skiprows=2)
    except Exception as exc:
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
