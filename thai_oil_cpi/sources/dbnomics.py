"""DBnomics mirror of IMF / BIS series (no key). Used for long FX history and as a fallback for crude."""
from __future__ import annotations

import json
import urllib.parse

import pandas as pd

from .http import SourceError, get


def fetch_monthly(provider: str, dataset: str, code: str) -> pd.Series:
    url = (f"https://api.db.nomics.world/v22/series/{provider}/{dataset}/"
           f"{urllib.parse.quote(code)}?observations=1&format=json")
    raw = get(url)
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


def fetch_usdthb_monthly() -> pd.Series:
    """IMF IFS period-average baht per US dollar (1957 →, lags a few months)."""
    return fetch_monthly("IMF", "IFS", "M.TH.ENDA_XDC_USD_RATE")


def fetch_dubai_monthly() -> pd.Series:
    """IMF primary commodity prices, Dubai Fateh USD/bbl (fallback for the Pink Sheet)."""
    return fetch_monthly("IMF", "PCPS", "M.W00.POILDUB.USD")
