"""World Bank Commodity Price Data (the Pink Sheet): monthly Dubai, Brent, WTI.

The spreadsheet URL carries a document id that changes between releases, so
it is discovered from the commodity-markets page each time, with the last
known URL as a fallback.
"""
from __future__ import annotations

import io
import re

import pandas as pd

from .http import SourceError, get

COMMODITY_PAGE = "https://www.worldbank.org/en/research/commodity-markets"
KNOWN_URL = ("https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/"
             "related/CMO-Historical-Data-Monthly.xlsx")
COLUMNS = {"Crude oil, Dubai": "dubai", "Crude oil, Brent": "brent", "Crude oil, WTI": "wti",
           "Crude oil, average": "crude_avg"}


def discover_url() -> str:
    try:
        html = get(COMMODITY_PAGE).decode("utf-8", "ignore")
    except SourceError:
        return KNOWN_URL
    m = re.search(r'https?://thedocs\.worldbank\.org/[^"\' <>]+CMO-Historical-Data-Monthly\.xlsx', html)
    return m.group(0) if m else KNOWN_URL


def fetch_pink_sheet_monthly(url: str | None = None) -> pd.DataFrame:
    """DataFrame indexed by monthly Period with columns dubai, brent, wti, crude_avg (USD/bbl)."""
    url = url or discover_url()
    raw = get(url, timeout=180)
    try:
        df = pd.read_excel(io.BytesIO(raw), sheet_name="Monthly Prices", header=None)
    except Exception as exc:
        raise SourceError(f"Could not parse Pink Sheet: {exc}") from exc
    header_row = next((i for i in range(10) if any(isinstance(v, str) and v.startswith("Crude oil") for v in df.iloc[i])), None)
    if header_row is None:
        raise SourceError("Pink Sheet layout changed: no 'Crude oil' header")
    names = df.iloc[header_row].tolist()
    cols = {i: COLUMNS[n] for i, n in enumerate(names) if isinstance(n, str) and n in COLUMNS}
    if "dubai" not in cols.values():
        raise SourceError("Pink Sheet has no Dubai column")
    data = df.iloc[header_row + 2:, [0] + list(cols)].copy()
    data.columns = ["period"] + [cols[i] for i in cols]
    data = data[data["period"].astype(str).str.match(r"^\d{4}M\d{2}$")]
    idx = pd.PeriodIndex(data["period"].astype(str).str.replace("M", "-"), freq="M")
    out = data.drop(columns="period").apply(pd.to_numeric, errors="coerce").set_index(idx)
    out.index.name = "month"
    out = out.dropna(subset=["dubai"])
    if out.empty:
        raise SourceError("Pink Sheet contained no Dubai observations")
    out.attrs["source_url"] = url
    return out
