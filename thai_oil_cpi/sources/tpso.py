"""Trade Policy and Strategy Office (TPSO), Ministry of Commerce: the official
Thai consumer price index, via the Index API behind https://index.tpso.go.th.

The public manual (https://www.tpso.go.th/indexAPI_Manual) documents
``index-api.tpso.go.th``; that host sits behind a WAF that rejects scripted
clients, so the site's own same-origin proxy ``index.tpso.go.th/api`` is tried
first and the documented host second.

``fetch_cpi_all`` returns one long table with every category in the general
CPI (CPIG, base 2566 = 2023, chained back to January 1976 for the headline and
top-level groups; sub-groups mostly start December 2001) including the current
basket weights that the API attaches to every observation.
"""
from __future__ import annotations

import json

import pandas as pd

from .http import SourceError, get, post_json

HOSTS = ["https://index.tpso.go.th/api", "https://index-api.tpso.go.th/api"]
HEADERS = {"Origin": "https://index.tpso.go.th", "Referer": "https://index.tpso.go.th/cpi/index-price-change-rate/5"}
TYPE_NATIONAL = "TG"

# Codes used by the model and the app.
CODES = {
    "00000": "headline",
    "10000": "food",
    "30000": "housing",
    "32000": "electricity_fuel_water",
    "50000": "transport_comm",
    "51000": "public_transport",
    "52000": "vehicles_fuel",
    "91000": "raw_food",
    "92000": "energy",
    "93000": "core",
}


def _try(fn):
    last = None
    for host in HOSTS:
        try:
            return fn(host)
        except SourceError as exc:
            last = exc
    raise SourceError(f"TPSO: all hosts failed: {last}")


def fetch_master() -> dict:
    """Metadata: base years, category tree, region types, available period, lastUpdated."""
    def go(host):
        d = json.loads(get(f"{host}/cpig/master", headers=HEADERS))
        if "period" not in d or "categories" not in d:
            raise SourceError("TPSO master payload malformed")
        return d
    return _try(go)


def _flatten(nodes, parent=None, out=None):
    out = out if out is not None else []
    for n in nodes:
        out.append((n, parent))
        _flatten(n.get("children") or [], n.get("commodityCode"), out)
    return out


def fetch_cpi_all(start_year_be: int = 2519, end_year_be: int | None = None, year_base_be: int = 2566,
                  region_type: str = TYPE_NATIONAL) -> pd.DataFrame:
    """Every category, every month. Years are Buddhist Era in the API (BE = CE + 543).

    Returns a DataFrame with columns: code, parent, name_th, name_en, month (Period),
    index, mom_pct, yoy_pct, weight_base, weight_current.
    """
    if end_year_be is None:
        end_year_be = pd.Timestamp.today().year + 543
    payload = {"YearBase": year_base_be, "Categories": [], "TimeOption": True,
               "Period": {"StartYear": start_year_be, "StartMonth": 1, "EndYear": end_year_be, "EndMonth": 12},
               "Types": [region_type]}

    def go(host):
        raw = post_json(f"{host}/cpig/filter", payload, headers=HEADERS, timeout=300)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise SourceError(f"TPSO filter returned non-JSON: {exc}") from exc
        if not isinstance(data, list) or not data:
            raise SourceError("TPSO filter returned no categories")
        return data

    data = _try(go)
    rows = []
    for node, parent in _flatten(data):
        code = node.get("commodityCode")
        for y in node.get("years") or []:
            for m in y.get("months") or []:
                if m.get("index") is None:
                    continue
                rows.append({
                    "code": code, "parent": parent,
                    "name_th": node.get("commodityNameTH"), "name_en": (node.get("commodityNameEN") or "").strip(),
                    "month": pd.Period(year=int(y["year"]) - 543, month=int(m["month"]), freq="M"),
                    "index": float(m["index"]),
                    "mom_pct": m.get("change"), "yoy_pct": m.get("changeYear"),
                    "weight_base": m.get("weightBar"), "weight_current": m.get("weightCurrent"),
                })
    if not rows:
        raise SourceError("TPSO filter returned no observations")
    df = pd.DataFrame(rows).drop_duplicates(["code", "month"]).sort_values(["code", "month"]).reset_index(drop=True)
    if "00000" not in set(df["code"]):
        raise SourceError("TPSO payload has no headline (00000) series")
    return df


def wide(df: pd.DataFrame, codes: dict[str, str] | None = None) -> pd.DataFrame:
    """Pivot the long table to one column per named series (index levels)."""
    codes = codes or CODES
    sub = df[df["code"].isin(codes)]
    w = sub.pivot(index="month", columns="code", values="index").rename(columns=codes).sort_index()
    w.index.name = "month"
    return w


def latest_weights(df: pd.DataFrame, codes: dict[str, str] | None = None) -> dict[str, float]:
    codes = codes or CODES
    last = df[df["code"].isin(codes)].sort_values("month").groupby("code").tail(1)
    return {codes[r.code]: float(r.weight_current) for r in last.itertuples() if r.weight_current is not None}
