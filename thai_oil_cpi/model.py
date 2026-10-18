"""Estimate the monthly local projections for every (shock, outcome) pair, for the national
indices and for each household type (regions, low income), plus the crude-to-pump first stage."""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm

from . import config as C
from .lp import LPSpec, local_projections, local_projections_asymmetric, local_projections_ext
from .sync import Dataset


def monthly_spec() -> LPSpec:
    return LPSpec(horizons=list(C.HORIZONS_M), lags_y=C.LAGS_M, lags_x=C.LAGS_M, hac_extra_lags=C.HAC_EXTRA_LAGS)


def _estimate_frame(df: pd.DataFrame, spec: LPSpec, shocks: dict, outcomes: list, meta: dict, tag: str) -> dict:
    out = {}
    for key, col in shocks.items():
        if col not in df:
            continue
        out[key] = {}
        for oc in outcomes:
            ycol = f"yoy_{oc}"
            if ycol not in df:
                continue
            cols = [ycol, col] + (["shock_food"] if C.USE_FOOD_CONTROL and "shock_food" in df else [])
            sample = df[cols].dropna()
            if len(sample) < spec.lags_y + max(spec.horizons) + 30:
                continue
            if C.USE_FOOD_CONTROL and "shock_food" in sample:
                irf = local_projections_ext(sample[ycol], sample[col], spec, controls=sample[["shock_food"]])["all"]
            else:
                irf = local_projections(sample[ycol], sample[col], spec)
            out[key][oc] = irf
            meta.setdefault("samples", {})[f"{tag}{key}/{oc}"] = {"first": str(sample.index[0]), "last": str(sample.index[-1]), "n": int(len(sample))}
    return out


def estimate_all(ds: Dataset, spec: LPSpec | None = None, sample_start: str = C.SAMPLE_START,
                 shocks: dict[str, str] | None = None, outcomes: list[str] | None = None) -> dict:
    """Returns {shock_key: {outcome: irf}} for the national indices, plus
    '_meta', '_asymmetric', '_types' ({type_name: {shock_key: {outcome: irf}}}) and '_pass_through'."""
    spec = spec or monthly_spec()
    shocks = shocks or C.SHOCKS
    outcomes = outcomes or C.OUTCOMES
    start = pd.Period(sample_start, freq="M")
    df = ds.monthly[ds.monthly.index >= start]
    meta = {"sample_start": str(start), "spec": {"horizons": spec.horizons, "lags_y": spec.lags_y, "lags_x": spec.lags_x,
                                                  "hac_maxlags": f"h+{spec.hac_extra_lags}", "frequency": "monthly"},
            "food_control": C.USE_FOOD_CONTROL, "regime_split": C.USE_REGIME, "samples": {}}
    out = _estimate_frame(df, spec, shocks, outcomes, meta, "")
    out["_meta"] = meta
    # Asymmetric diagnostic for the primary shock.
    out["_asymmetric"] = {}
    col = shocks.get(C.PRIMARY_SHOCK)
    if col in df:
        for oc in outcomes:
            ycol = f"yoy_{oc}"
            if ycol in df:
                s = df[[ycol, col]].dropna()
                if len(s) >= 100:
                    out["_asymmetric"][oc] = local_projections_asymmetric(s[ycol], s[col], spec)
    # Household types: regional and low-income indices joined to the national shock series.
    out["_types"] = {}
    shock_cols = [c for c in shocks.values() if c in df] + (["shock_food"] if "shock_food" in df else [])
    for tname, frame in (ds.types or {}).items():
        if tname == "national" or frame is None:
            continue
        joined = frame.join(df[shock_cols], how="inner")
        joined = joined[joined.index >= start]
        out["_types"][tname] = _estimate_frame(joined, spec, shocks, outcomes, meta, f"{tname}:")
    out["_pass_through"] = crude_to_pump_pass_through(ds.monthly)
    return out


def crude_to_pump_pass_through(monthly: pd.DataFrame, lags: int = 3, start: str = "2003-02") -> dict:
    """First stage: cumulative pass-through from the crude shock (THB) to the Bangkok pump index
    over ``lags`` months, overall and split by Oil Fund regime and by direction. Used to chain
    what-if crude scenarios into the pump-price model."""
    need = ["shock_retail_fuel", "shock_dubai_thb"]
    if any(c not in monthly for c in need):
        return {}
    d = monthly.loc[start:, need + (["regime_subsidy"] if "regime_subsidy" in monthly else [])].dropna(subset=need).copy()
    xs = ["shock_dubai_thb"]
    for k in range(1, lags + 1):
        d[f"x{k}"] = d["shock_dubai_thb"].shift(k); xs.append(f"x{k}")
    d = d.dropna(subset=xs)

    def fit(sub):
        if len(sub) < 30:
            return None
        r = sm.OLS(sub["shock_retail_fuel"], sm.add_constant(sub[xs])).fit(cov_type="HAC", cov_kwds={"maxlags": lags})
        ones = np.ones(len(xs)); cov = r.cov_params().loc[xs, xs].values
        return {"cumulative": float(r.params[xs].sum()), "se": float(np.sqrt(ones @ cov @ ones)),
                "contemporaneous": float(r.params["shock_dubai_thb"]), "n": int(len(sub)),
                "by_lag": [float(r.params[c]) for c in xs]}
    out = {"lags": lags, "all": fit(d), "rising": fit(d[d["shock_dubai_thb"] > 0]), "falling": fit(d[d["shock_dubai_thb"] <= 0])}
    if "regime_subsidy" in d:
        out["subsidy"] = fit(d[d["regime_subsidy"] == 1]); out["collecting"] = fit(d[d["regime_subsidy"] == 0])
    return out
