"""Pseudo out-of-sample evaluation of the pass-through model.

For each origin month T in the evaluation window the model is re-estimated using only
observations whose outcome month is at or before T, then the oil-driven change in the
outcome's year-on-year rate from T to T+j is projected using the shocks realised up to
T+j (this evaluates pass-through, not oil-price forecasting) and compared with the actual
change. A "no change" benchmark (projected change = 0) shows whether the model has skill.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from . import config as C
from .lp import LPSpec, local_projections, local_projections_ext


def _oil_component(irf, shocks: pd.Series, at: pd.Period, regime: pd.Series | None = None) -> float:
    """Σ_{h=1..H} β_h · shock_{at−h}: the oil-driven level of the outcome at month ``at``.

    ``irf`` is a DataFrame, or {'regime1': df, 'regime0': df} in which case β is taken from the
    regime that prevailed in the month of each shock.
    """
    if isinstance(irf, dict):
        b1 = {int(r.h): float(r.beta) for r in irf["regime1"].itertuples()}
        b0 = {int(r.h): float(r.beta) for r in irf["regime0"].itertuples()}
        total = 0.0
        for h in b1:
            m = at - h
            if m in shocks.index and not math.isnan(shocks[m]):
                rg = regime[m] if regime is not None and m in regime.index and not math.isnan(regime[m]) else 0.0
                b = b1[h] if rg >= 0.5 else b0[h]
                if not math.isnan(b):
                    total += b * shocks[m]
        return total
    beta = {int(r.h): float(r.beta) for r in irf.itertuples()}
    total = 0.0
    for h, b in beta.items():
        m = at - h
        if m in shocks.index and not math.isnan(shocks[m]) and not math.isnan(b):
            total += b * shocks[m]
    return total


def rolling_backtest(monthly: pd.DataFrame, shock_col: str, outcome: str = "headline", spec: LPSpec | None = None,
                     sample_start: str = C.SAMPLE_START, origins: int = 36, horizons=(1, 3, 6, 12),
                     control_cols: list | None = None, regime_col: str | None = None) -> dict:
    spec = spec or LPSpec(horizons=list(C.HORIZONS_M), lags_y=C.LAGS_M, lags_x=C.LAGS_M, hac_extra_lags=C.HAC_EXTRA_LAGS)
    ycol = f"yoy_{outcome}"
    extra = [c for c in (control_cols or []) if c in monthly] + ([regime_col] if regime_col and regime_col in monthly else [])
    df = monthly[monthly.index >= pd.Period(sample_start, freq="M")][[ycol, shock_col] + extra].dropna()
    y, x = df[ycol], df[shock_col]
    ctrl = df[[c for c in (control_cols or []) if c in df]] if control_cols else None
    reg = df[regime_col] if regime_col and regime_col in df else None
    last = df.index[-1]
    hmax = max(horizons)
    rows = []
    for k in range(origins, 0, -1):
        T = last - hmax - k + 1  # origin such that T + hmax is still observed
        if T <= df.index[0] + 60:
            continue
        fit = df[df.index <= T]
        if ctrl is not None or reg is not None:
            res = local_projections_ext(fit[ycol], fit[shock_col], spec,
                                        controls=ctrl.loc[fit.index] if ctrl is not None else None,
                                        regime=reg.loc[fit.index] if reg is not None else None)
            irf = res if "regime1" in res else res["all"]
        else:
            irf = local_projections(fit[ycol], fit[shock_col], spec)
        base = _oil_component(irf, x, T, reg)
        for j in horizons:
            Tj = T + j
            if Tj not in y.index:
                continue
            proj = _oil_component(irf, x, Tj, reg) - base
            actual = float(y[Tj] - y[T])
            rows.append({"origin": str(T), "h": j, "projected": proj, "actual": actual})
    res = pd.DataFrame(rows)
    if res.empty:
        return {"shock": shock_col, "outcome": outcome, "by_h": [], "rows": []}
    by_h = []
    for j, g in res.groupby("h"):
        err = g["projected"] - g["actual"]
        by_h.append({"h": int(j), "n": int(len(g)), "rmse": float(np.sqrt((err ** 2).mean())), "mae": float(err.abs().mean()),
                     "bias": float(err.mean()), "rmse_no_change": float(np.sqrt((g["actual"] ** 2).mean())),
                     "corr": float(g["projected"].corr(g["actual"])) if len(g) > 2 else None})
    return {"shock": shock_col, "outcome": outcome, "origins": int(res["origin"].nunique()),
            "window": {"first_origin": res["origin"].min(), "last_origin": res["origin"].max()}, "by_h": by_h,
            "rows": res.round(4).to_dict(orient="records")}
