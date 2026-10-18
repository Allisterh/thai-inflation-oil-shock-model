"""Estimate the monthly local projections for every (shock, outcome) pair."""
from __future__ import annotations

import pandas as pd

from . import config as C
from .lp import LPSpec, local_projections
from .sync import Dataset


def monthly_spec() -> LPSpec:
    return LPSpec(horizons=list(C.HORIZONS_M), lags_y=C.LAGS_M, lags_x=C.LAGS_M, hac_extra_lags=C.HAC_EXTRA_LAGS)


def estimate_all(ds: Dataset, spec: LPSpec | None = None, sample_start: str = C.SAMPLE_START,
                 shocks: dict[str, str] | None = None, outcomes: list[str] | None = None) -> dict:
    """Returns {shock_key: {outcome: irf DataFrame}} plus sample metadata under '_meta'."""
    spec = spec or monthly_spec()
    shocks = shocks or C.SHOCKS
    outcomes = outcomes or C.OUTCOMES
    start = pd.Period(sample_start, freq="M")
    df = ds.monthly[ds.monthly.index >= start]
    out: dict = {"_meta": {"sample_start": str(start), "spec": {"horizons": spec.horizons, "lags_y": spec.lags_y,
                                                                 "lags_x": spec.lags_x, "hac_maxlags": f"h+{spec.hac_extra_lags}",
                                                                 "frequency": "monthly"}, "samples": {}}}
    for key, col in shocks.items():
        if col not in df:
            continue
        out[key] = {}
        for oc in outcomes:
            ycol = f"yoy_{oc}"
            if ycol not in df:
                continue
            sample = df[[ycol, col]].dropna()
            if len(sample) < spec.lags_y + max(spec.horizons) + 30:
                continue
            irf = local_projections(sample[ycol], sample[col], spec)
            out[key][oc] = irf
            out["_meta"]["samples"][f"{key}/{oc}"] = {"first": str(sample.index[0]), "last": str(sample.index[-1]), "n": int(len(sample))}
    return out


def cumulative_level_effect(irf: pd.DataFrame) -> pd.DataFrame:
    """Not used for YoY outcomes; kept for log-level specifications."""
    out = irf.copy()
    out["cum_beta"] = out["beta"].cumsum()
    return out
