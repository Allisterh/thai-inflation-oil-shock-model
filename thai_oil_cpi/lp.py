"""Jordà (2005) local projections with Newey–West (HAC) standard errors.

The default specification reproduces ``notebooks/analysis.ipynb``: for each
horizon h the outcome at t+h is regressed on the contemporaneous shock, LAGS_Y
lags of the outcome and LAGS_X lags of the shock, with HAC maxlags = h + 1.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
import statsmodels.api as sm

from .config import CONF_Z, HAC_EXTRA_LAGS, HORIZONS_Q, LAGS_Q


@dataclass
class LPSpec:
    horizons: list[int] = field(default_factory=lambda: list(HORIZONS_Q))
    lags_y: int = LAGS_Q
    lags_x: int = LAGS_Q
    hac_extra_lags: int = HAC_EXTRA_LAGS
    conf_z: float = CONF_Z


def local_projections(y: pd.Series, x: pd.Series, spec: LPSpec | None = None) -> pd.DataFrame:
    """Estimate the impulse response of ``y`` to a unit shock in ``x``.

    Parameters
    ----------
    y : outcome series (e.g. CPI YoY inflation, %), aligned with ``x``.
    x : shock series (e.g. 100 × Δlog Brent), same index as ``y``.

    Returns a DataFrame with one row per horizon: h, beta, se, n, lower, upper,
    tstat, pvalue, significant.
    """
    spec = spec or LPSpec()
    df = pd.DataFrame({"y": y.astype(float), "x": x.astype(float)}).dropna()
    for k in range(1, spec.lags_y + 1):
        df[f"y_lag{k}"] = df["y"].shift(k)
    for k in range(1, spec.lags_x + 1):
        df[f"x_lag{k}"] = df["x"].shift(k)
    x_cols = ["x"] + [f"y_lag{k}" for k in range(1, spec.lags_y + 1)] + \
             [f"x_lag{k}" for k in range(1, spec.lags_x + 1)]

    rows = []
    for h in spec.horizons:
        tmp = df.copy()
        tmp["y_lead"] = tmp["y"].shift(-h)
        tmp = tmp[["y_lead"] + x_cols].dropna()
        n_params = len(x_cols) + 1
        if len(tmp) <= n_params + 1:
            rows.append({"h": h, "beta": np.nan, "se": np.nan, "n": int(len(tmp)),
                         "tstat": np.nan, "pvalue": np.nan})
            continue
        X = sm.add_constant(tmp[x_cols])
        res = sm.OLS(tmp["y_lead"], X).fit(cov_type="HAC",
                                           cov_kwds={"maxlags": h + spec.hac_extra_lags})
        rows.append({
            "h": h,
            "beta": float(res.params["x"]),
            "se": float(res.bse["x"]),
            "n": int(res.nobs),
            "tstat": float(res.tvalues["x"]),
            "pvalue": float(res.pvalues["x"]),
        })
    irf = pd.DataFrame(rows)
    irf["lower"] = irf["beta"] - spec.conf_z * irf["se"]
    irf["upper"] = irf["beta"] + spec.conf_z * irf["se"]
    irf["significant"] = (irf["lower"] > 0) | (irf["upper"] < 0)
    return irf


def scenario_table(irf: pd.DataFrame, shocks_pct: list[float]) -> pd.DataFrame:
    """Linear scaling of the IRF for a list of oil-price shocks (percent)."""
    out = []
    for s in shocks_pct:
        for _, r in irf.iterrows():
            out.append({
                "Shock_%": s, "Horizon_q": int(r["h"]),
                "CPI_Impact_pp": r["beta"] * s,
                "Lower_pp": r["lower"] * s, "Upper_pp": r["upper"] * s,
            })
    return pd.DataFrame(out)


def local_projections_asymmetric(y: pd.Series, x: pd.Series, spec: LPSpec | None = None) -> dict[str, pd.DataFrame]:
    """Separate responses to increases and decreases in the shock.

    The shock enters as two regressors, max(x, 0) and min(x, 0), each with its own lags, so
    β⁺_h and β⁻_h are the responses to a one-unit rise and a one-unit fall. Returns
    {'up': irf, 'down': irf} with the same columns as ``local_projections``.
    """
    spec = spec or LPSpec()
    df = pd.DataFrame({"y": y.astype(float), "x": x.astype(float)}).dropna()
    df["xp"] = df["x"].clip(lower=0)
    df["xn"] = df["x"].clip(upper=0)
    for k in range(1, spec.lags_y + 1):
        df[f"y_lag{k}"] = df["y"].shift(k)
    for k in range(1, spec.lags_x + 1):
        df[f"xp_lag{k}"] = df["xp"].shift(k)
        df[f"xn_lag{k}"] = df["xn"].shift(k)
    x_cols = ["xp", "xn"] + [f"y_lag{k}" for k in range(1, spec.lags_y + 1)] + \
             [f"xp_lag{k}" for k in range(1, spec.lags_x + 1)] + [f"xn_lag{k}" for k in range(1, spec.lags_x + 1)]
    rows = {"up": [], "down": []}
    for h in spec.horizons:
        tmp = df.copy(); tmp["y_lead"] = tmp["y"].shift(-h); tmp = tmp[["y_lead"] + x_cols].dropna()
        if len(tmp) <= len(x_cols) + 2:
            for k in rows: rows[k].append({"h": h, "beta": np.nan, "se": np.nan, "n": int(len(tmp)), "tstat": np.nan, "pvalue": np.nan})
            continue
        res = sm.OLS(tmp["y_lead"], sm.add_constant(tmp[x_cols])).fit(cov_type="HAC", cov_kwds={"maxlags": h + spec.hac_extra_lags})
        for key, col in (("up", "xp"), ("down", "xn")):
            rows[key].append({"h": h, "beta": float(res.params[col]), "se": float(res.bse[col]), "n": int(res.nobs),
                              "tstat": float(res.tvalues[col]), "pvalue": float(res.pvalues[col])})
    out = {}
    for key, r in rows.items():
        irf = pd.DataFrame(r)
        irf["lower"] = irf["beta"] - spec.conf_z * irf["se"]; irf["upper"] = irf["beta"] + spec.conf_z * irf["se"]
        irf["significant"] = (irf["lower"] > 0) | (irf["upper"] < 0)
        out[key] = irf
    return out


def local_projections_ext(y: pd.Series, x: pd.Series, spec: LPSpec | None = None,
                          controls: pd.DataFrame | None = None, regime: pd.Series | None = None) -> dict:
    """Local projections with optional controls and a two-regime shock.

    controls : extra regressors entered contemporaneously and with ``spec.lags_x`` lags
               (e.g. the log change in a world food price index).
    regime   : 0/1 series aligned with ``x``. When given, the shock enters as x·regime and
               x·(1−regime) with separate lags, and the regime indicator itself is a control,
               so β is estimated separately for the two states.

    Returns {'all': irf} without a regime, or {'regime1': irf, 'regime0': irf} with one.
    """
    spec = spec or LPSpec()
    df = pd.DataFrame({"y": y.astype(float), "x": x.astype(float)})
    if controls is not None:
        for c in controls.columns:
            df[f"c_{c}"] = controls[c].astype(float)
    if regime is not None:
        df["r"] = regime.astype(float)
    df = df.dropna()
    shock_cols = []
    if regime is not None:
        df["x1"] = df["x"] * df["r"]; df["x0"] = df["x"] * (1 - df["r"]); shock_cols = ["x1", "x0"]
    else:
        shock_cols = ["x"]
    cols = list(shock_cols)
    for k in range(1, spec.lags_y + 1):
        df[f"y_lag{k}"] = df["y"].shift(k); cols.append(f"y_lag{k}")
    for sc in shock_cols:
        for k in range(1, spec.lags_x + 1):
            df[f"{sc}_lag{k}"] = df[sc].shift(k); cols.append(f"{sc}_lag{k}")
    if regime is not None:
        cols.append("r")
    ctrl_cols = [c for c in df.columns if c.startswith("c_")]
    for c in ctrl_cols:
        cols.append(c)
        for k in range(1, spec.lags_x + 1):
            df[f"{c}_lag{k}"] = df[c].shift(k); cols.append(f"{c}_lag{k}")
    out_rows = {sc: [] for sc in shock_cols}
    for h in spec.horizons:
        tmp = df.copy(); tmp["y_lead"] = tmp["y"].shift(-h); tmp = tmp[["y_lead"] + cols].dropna()
        if len(tmp) <= len(cols) + 2:
            for sc in shock_cols:
                out_rows[sc].append({"h": h, "beta": np.nan, "se": np.nan, "n": int(len(tmp)), "tstat": np.nan, "pvalue": np.nan})
            continue
        res = sm.OLS(tmp["y_lead"], sm.add_constant(tmp[cols])).fit(cov_type="HAC", cov_kwds={"maxlags": h + spec.hac_extra_lags})
        for sc in shock_cols:
            out_rows[sc].append({"h": h, "beta": float(res.params[sc]), "se": float(res.bse[sc]), "n": int(res.nobs),
                                 "tstat": float(res.tvalues[sc]), "pvalue": float(res.pvalues[sc])})
    out = {}
    names = {"x": "all", "x1": "regime1", "x0": "regime0"}
    for sc, rows in out_rows.items():
        irf = pd.DataFrame(rows)
        irf["lower"] = irf["beta"] - spec.conf_z * irf["se"]; irf["upper"] = irf["beta"] + spec.conf_z * irf["se"]
        irf["significant"] = (irf["lower"] > 0) | (irf["upper"] < 0)
        out[names[sc]] = irf
    return out
