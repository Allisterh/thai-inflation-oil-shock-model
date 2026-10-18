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

from .config import CONF_Z, HAC_EXTRA_LAGS, HORIZONS, LAGS_X, LAGS_Y


@dataclass
class LPSpec:
    horizons: list[int] = field(default_factory=lambda: list(HORIZONS))
    lags_y: int = LAGS_Y
    lags_x: int = LAGS_X
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
