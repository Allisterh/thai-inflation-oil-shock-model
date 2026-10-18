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
from .lp import LPSpec, local_projections


def _oil_component(irf: pd.DataFrame, shocks: pd.Series, at: pd.Period) -> float:
    """Σ_{h=1..H} β_h · shock_{at−h}: the oil-driven level of the outcome at month ``at``."""
    beta = {int(r.h): float(r.beta) for r in irf.itertuples()}
    total = 0.0
    for h, b in beta.items():
        m = at - h
        if m in shocks.index and not math.isnan(shocks[m]) and not math.isnan(b):
            total += b * shocks[m]
    return total


def rolling_backtest(monthly: pd.DataFrame, shock_col: str, outcome: str = "headline", spec: LPSpec | None = None,
                     sample_start: str = C.SAMPLE_START, origins: int = 36, horizons=(1, 3, 6, 12)) -> dict:
    spec = spec or LPSpec(horizons=list(C.HORIZONS_M), lags_y=C.LAGS_M, lags_x=C.LAGS_M, hac_extra_lags=C.HAC_EXTRA_LAGS)
    ycol = f"yoy_{outcome}"
    df = monthly[monthly.index >= pd.Period(sample_start, freq="M")][[ycol, shock_col]].dropna()
    y, x = df[ycol], df[shock_col]
    last = df.index[-1]
    hmax = max(horizons)
    rows = []
    for k in range(origins, 0, -1):
        T = last - hmax - k + 1  # origin such that T + hmax is still observed
        if T <= df.index[0] + 60:
            continue
        fit = df[df.index <= T]
        irf = local_projections(fit[ycol], fit[shock_col], spec)
        base = _oil_component(irf, x, T)
        for j in horizons:
            Tj = T + j
            if Tj not in y.index:
                continue
            proj = _oil_component(irf, x, Tj) - base
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
