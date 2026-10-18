"""Turn impulse responses plus live prices into household-level numbers.

Horizons are months. ``irf`` frames come from ``model.estimate_all``.
"""
from __future__ import annotations

import math

import pandas as pd

from .config import CONF_Z, LITRES_PER_BARREL, VAT_RATE

# Household budget categories: TPSO series used for each, and how the "other" share is proxied.
HOUSEHOLD_CATEGORIES = [
    {"key": "vehicles_fuel", "outcome": "vehicles_fuel"},
    {"key": "electricity_fuel_water", "outcome": "electricity_fuel_water"},
    {"key": "public_transport", "outcome": "public_transport"},
    {"key": "food", "outcome": "food"},
    {"key": "other", "outcome": "core"},
]


def _lookup(irf: pd.DataFrame):
    return ({int(r.h): float(r.beta) for r in irf.itertuples()},
            {int(r.h): float(r.se) for r in irf.itertuples()})


def scenario_path(irf: pd.DataFrame, shock_pct: float) -> list[dict]:
    beta, se = _lookup(irf)
    return [{"h": h, "impact_pp": beta[h] * shock_pct,
             "lower_pp": (beta[h] - CONF_Z * se[h]) * shock_pct,
             "upper_pp": (beta[h] + CONF_Z * se[h]) * shock_pct}
            for h in sorted(beta) if not math.isnan(beta[h])]


def observed_shock_path(irf: pd.DataFrame, shocks: list[tuple[str, float]], horizons_ahead: int | None = None) -> list[dict]:
    """Carry each past shock forward along the IRF. The last shock is the current period (k = 0).

    Δπ_{t+j} = Σ_k β_{j+k} · shock_{t−k}. Bands treat the β_h as independent (approximate).
    """
    beta, se = _lookup(irf)
    hmax = max(beta)
    H = horizons_ahead or hmax
    shocks = [(lab, float(v)) for lab, v in shocks if v is not None and not math.isnan(float(v))]
    rows = []
    for j in range(1, H + 1):
        total, var, parts = 0.0, 0.0, []
        for k, (lab, s) in enumerate(reversed(shocks)):
            h = j + k
            if h > hmax or math.isnan(beta.get(h, float("nan"))):
                continue
            total += beta[h] * s
            var += (se[h] * s) ** 2
            parts.append({"period": lab, "shock_pct": s, "h": h, "contribution_pp": beta[h] * s})
        rows.append({"h": j, "impact_pp": total, "lower_pp": total - CONF_Z * math.sqrt(var),
                     "upper_pp": total + CONF_Z * math.sqrt(var), "contributions": parts})
    return rows


def shock_history(monthly: pd.DataFrame, nowcast: dict, column: str = "shock_dubai_thb",
                  n_past: int = 23, current_mode: str = "mtd") -> list[tuple[str, float]]:
    """Complete-month shocks from the dataset plus nowcast months chained on the end.

    ``current_mode`` is 'mtd' (month-to-date average) or 'spot' (latest close held for the month).
    Only the Dubai-in-baht and Dubai-in-dollars shocks can be nowcast; Brent uses its own daily data
    through the same path because the nowcast months carry ``brent_usd`` too.
    """
    past = monthly[column].dropna().tail(n_past)
    out = [(str(p), float(v)) for p, v in past.items()]
    level_col = {"shock_dubai_thb": "dubai_thb", "shock_dubai_usd": "dubai_usd", "shock_brent_usd": "brent_usd"}[column]
    prev_level = float(monthly[level_col].dropna().iloc[-1])
    key = {"dubai_thb": "dubai_thb_nowcast", "dubai_usd": "dubai_usd_nowcast", "brent_usd": "brent_usd"}[level_col]
    months = nowcast.get("months", [])
    for i, m in enumerate(months):
        level = m.get(key)
        if m.get("partial") and current_mode == "spot":
            spot = {"dubai_thb": nowcast.get("dubai_spot_nowcast_thb"), "dubai_usd": nowcast.get("dubai_spot_nowcast_usd"),
                    "brent_usd": nowcast.get("brent_latest")}[level_col]
            level = spot if spot else level
        if not level or not prev_level:
            continue
        label = m["month"] + (" (so far)" if m.get("partial") and current_mode == "mtd" else " (spot held)" if m.get("partial") else " (nowcast)")
        out.append((label, float(100 * math.log(level / prev_level))))
        prev_level = level
    return out


def household_breakdown(irfs_by_outcome: dict[str, pd.DataFrame], paths_by_outcome: dict[str, list[dict]],
                        monthly_spend_thb: float, shares: dict[str, float]) -> dict:
    """Extra baht per month by category and horizon.

    ``shares`` are the household's spending shares (sum ≈ 1) for the keys in HOUSEHOLD_CATEGORIES.
    ``paths_by_outcome`` maps outcome → path rows (from scenario_path or observed_shock_path).
    """
    cats = []
    H = max(len(p) for p in paths_by_outcome.values())
    total = [0.0] * H
    for c in HOUSEHOLD_CATEGORIES:
        path = paths_by_outcome.get(c["outcome"])
        if path is None:
            continue
        share = float(shares.get(c["key"], 0.0))
        spend = monthly_spend_thb * share
        rows = [{"h": r["h"], "extra_thb": spend * r["impact_pp"] / 100,
                 "low": spend * r["lower_pp"] / 100, "high": spend * r["upper_pp"] / 100} for r in path]
        for i, r in enumerate(rows):
            total[i] += r["extra_thb"]
        cats.append({"key": c["key"], "outcome": c["outcome"], "share": share, "spend_thb": spend, "by_h": rows,
                     "peak_extra_thb": max((r["extra_thb"] for r in rows), default=0.0),
                     "year1_total_thb": sum(r["extra_thb"] for r in rows if r["h"] <= 12)})
    return {"monthly_spend_thb": monthly_spend_thb, "categories": cats, "total_by_h": total,
            "peak_extra_thb": max(total) if total else 0.0, "peak_h": (total.index(max(total)) + 1) if total else None,
            "year1_total_thb": sum(total[:12])}


def pump_price_change(crude_from_thb_bbl: float, crude_to_thb_bbl: float, pass_through: float = 1.0,
                      product_factor: float = 1.0) -> dict:
    """Change in THB/litre at the pump implied by a change in crude cost.

    Ex-refinery prices track imported product prices, which move roughly one for one with crude per
    litre (``product_factor`` scales that). Excise, municipal tax, the Oil Fund levy and the marketing
    margin are set in baht per litre and are treated as fixed; VAT (7%) applies on top, so a one baht
    move in ex-refinery cost is 1.07 baht at the pump before any Oil Fund cushioning (``pass_through``).
    """
    d_crude = (crude_to_thb_bbl - crude_from_thb_bbl) / LITRES_PER_BARREL
    d_exref = d_crude * product_factor
    d_pump = d_exref * (1 + VAT_RATE) * pass_through
    return {"crude_from_thb_per_litre": crude_from_thb_bbl / LITRES_PER_BARREL,
            "crude_to_thb_per_litre": crude_to_thb_bbl / LITRES_PER_BARREL,
            "delta_crude_thb_per_litre": d_crude, "delta_ex_refinery_thb_per_litre": d_exref,
            "delta_pump_thb_per_litre": d_pump, "pass_through": pass_through, "product_factor": product_factor}
