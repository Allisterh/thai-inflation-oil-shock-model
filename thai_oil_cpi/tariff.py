"""Announced electricity tariff (Ft) override.

Thailand's regulated electricity price is fixed for four months at a time by the Energy Regulatory
Commission, so for the months an announcement covers the electricity line is known, not modelled.
The announcements are read from ``data/ft_tariff.json`` (kept by hand, see the ``_about`` field).
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import config as C


def load_ft(path: Path = C.FT_TARIFF_JSON) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def tariff_outlook(ft: dict | None, today: pd.Period | None = None, horizons: int = 24) -> dict | None:
    """Known percentage change in the electricity tariff from today's period to each month ahead.

    Returns ``{"current": period, "known_change_pct": [h=1..covered], "covered_until": "YYYY-MM",
    "periods": [...]}`` or None when today's period is not in the file. Months after the last announced
    period are not covered, so the list is shorter than ``horizons`` and the caller falls back to the model.
    """
    if not ft or not ft.get("periods"):
        return None
    today = today or pd.Timestamp.today().to_period("M")
    periods = []
    for p in ft["periods"]:
        periods.append({**p, "_start": pd.Period(p["start"], freq="M"), "_end": pd.Period(p["end"], freq="M")})
    cur = next((p for p in periods if p["_start"] <= today <= p["_end"] and p.get("tariff_thb_per_kwh")), None)
    if cur is None:
        return None
    base = float(cur["tariff_thb_per_kwh"])
    known, covered_until = [], None
    for h in range(1, horizons + 1):
        m = today + h
        p = next((q for q in periods if q["_start"] <= m <= q["_end"]), None)
        if p is None or not p.get("tariff_thb_per_kwh"):
            break
        known.append(100 * (float(p["tariff_thb_per_kwh"]) / base - 1))
        covered_until = str(m)
    prev = next((p for p in periods if p["_end"] == cur["_start"] - 1 and p.get("tariff_thb_per_kwh")), None)
    return {
        "current": {"start": cur["start"], "end": cur["end"], "tariff_thb_per_kwh": base, "ft_satang_per_kwh": cur.get("ft_satang_per_kwh"), "source": cur.get("source")},
        "previous_tariff_thb_per_kwh": float(prev["tariff_thb_per_kwh"]) if prev else None,
        "change_from_previous_pct": (100 * (base / float(prev["tariff_thb_per_kwh"]) - 1)) if prev else None,
        "known_change_pct": known, "covered_until": covered_until, "months_covered": len(known),
        "base_tariff_thb_per_kwh": ft.get("base_tariff_thb_per_kwh"),
        "periods": [{k: v for k, v in p.items() if not k.startswith("_")} for p in periods],
    }
