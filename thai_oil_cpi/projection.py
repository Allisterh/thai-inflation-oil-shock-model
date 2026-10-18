"""Turn the estimated IRF plus live oil data into things a household can use.

* ``scenario_path``      – β_h × shock, the classic LP scenario (with CI).
* ``observed_shock_path``– what the oil moves that have *already happened*
                           (last 8 quarters + the current quarter so far) imply
                           for the next 8 quarters of YoY inflation.
* ``household_costs``    – extra baht per month for a given monthly spend.
* ``pump_price_change``  – rough change in THB per litre at the pump.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from .config import CONF_Z, LITRES_PER_BARREL


def _irf_lookup(irf: pd.DataFrame) -> tuple[dict[int, float], dict[int, float]]:
    beta = {int(r.h): float(r.beta) for r in irf.itertuples()}
    se = {int(r.h): float(r.se) for r in irf.itertuples()}
    return beta, se


def scenario_path(irf: pd.DataFrame, shock_pct: float) -> list[dict]:
    """Impact on YoY CPI inflation (pp) at each horizon for a one-off oil shock."""
    beta, se = _irf_lookup(irf)
    out = []
    for h in sorted(beta):
        if math.isnan(beta[h]):
            continue
        out.append({
            "h": h,
            "impact_pp": beta[h] * shock_pct,
            "lower_pp": (beta[h] - CONF_Z * se[h]) * shock_pct,
            "upper_pp": (beta[h] + CONF_Z * se[h]) * shock_pct,
        })
    return out


def observed_shock_path(irf: pd.DataFrame, shocks: list[tuple[str, float]], horizons_ahead: int | None = None) -> list[dict]:
    """Sum the IRF over a history of quarterly shocks.

    ``shocks`` is ordered oldest → newest and the last element is treated as the
    current quarter (k = 0). The contribution to inflation j quarters ahead is
    Σ_k β_{j+k} · shock_{t−k} for j + k within the estimated horizons. Confidence
    bands treat the β_h as independent, which is an approximation.
    """
    beta, se = _irf_lookup(irf)
    hmax = max(beta)
    H = horizons_ahead or hmax
    shocks = [(lab, float(s)) for lab, s in shocks if s is not None and not math.isnan(float(s))]
    rows = []
    for j in range(1, H + 1):
        total, var, parts = 0.0, 0.0, []
        for k, (lab, s) in enumerate(reversed(shocks)):
            h = j + k
            if h > hmax or math.isnan(beta.get(h, float("nan"))):
                continue
            c = beta[h] * s
            total += c
            var += (se[h] * s) ** 2
            parts.append({"quarter": lab, "shock_pct": s, "h": h, "contribution_pp": c})
        rows.append({"h": j, "impact_pp": total,
                     "lower_pp": total - CONF_Z * math.sqrt(var),
                     "upper_pp": total + CONF_Z * math.sqrt(var),
                     "contributions": parts})
    return rows


def household_costs(path: list[dict], monthly_spend_thb: float) -> dict:
    """Extra baht a household pays per month at each horizon, plus a 12-month total.

    A horizon is a quarter; the extra monthly cost in that quarter is
    spend × impact_pp / 100. The 12-month total adds three months per quarter
    for horizons 1–4.
    """
    per_h = [{"h": r["h"],
              "extra_thb_per_month": monthly_spend_thb * r["impact_pp"] / 100,
              "extra_low": monthly_spend_thb * r["lower_pp"] / 100,
              "extra_high": monthly_spend_thb * r["upper_pp"] / 100} for r in path]
    first_year = [r for r in per_h if r["h"] <= 4]
    return {
        "monthly_spend_thb": monthly_spend_thb,
        "by_horizon": per_h,
        "year1_total_thb": 3 * sum(r["extra_thb_per_month"] for r in first_year),
        "year1_low_thb": 3 * sum(r["extra_low"] for r in first_year),
        "year1_high_thb": 3 * sum(r["extra_high"] for r in first_year),
        "peak_extra_thb_per_month": max((r["extra_thb_per_month"] for r in per_h), default=0.0),
    }


def pump_price_change(brent_from_usd: float, brent_to_usd: float, usdthb: float,
                      pass_through: float = 1.0, product_factor: float = 1.0) -> dict:
    """Change in THB per litre implied by a Brent move.

    crude cost per litre = Brent (USD/bbl) × USD/THB ÷ 158.987 L/bbl. Thai pump
    prices add excise, municipal tax, Oil Fund levy, marketing margin and VAT,
    which are largely fixed per litre, so the *change* at the pump is roughly the
    change in crude cost × product_factor (refining margin, ≈1) × pass_through
    (1 for gasohol, lower for diesel while the Oil Fund caps it). All parameters
    are user-adjustable in the app and this is an approximation, not a forecast.
    """
    per_litre_from = brent_from_usd * usdthb / LITRES_PER_BARREL
    per_litre_to = brent_to_usd * usdthb / LITRES_PER_BARREL
    delta = (per_litre_to - per_litre_from) * product_factor * pass_through
    return {"crude_thb_per_litre_from": per_litre_from,
            "crude_thb_per_litre_to": per_litre_to,
            "delta_thb_per_litre": delta,
            "pass_through": pass_through, "product_factor": product_factor}


def shock_history(quarterly: pd.DataFrame, current: dict, column: str = "oil_shock_pct",
                  n_past: int = 7, current_mode: str = "qtd") -> list[tuple[str, float]]:
    """Last ``n_past`` complete-quarter shocks plus the current partial quarter."""
    past = quarterly[column].dropna().tail(n_past)
    out = [(str(q), float(v)) for q, v in past.items()]
    key = {"qtd": "shock_qtd_pct", "spot": "shock_spot_persists_pct"}.get(current_mode, "shock_qtd_pct")
    if column == "oil_shock_thb_pct":
        key = key.replace("_pct", "_thb_pct")
    if current.get(key) is not None:
        out.append((current["quarter"] + " (so far)" if current_mode == "qtd" else current["quarter"] + " (spot persists)",
                    float(current[key])))
    return out
