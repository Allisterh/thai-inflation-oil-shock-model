import numpy as np
import pandas as pd

from thai_oil_cpi.lp import LPSpec, local_projections, local_projections_asymmetric
from thai_oil_cpi.backtest import rolling_backtest
from thai_oil_cpi.projection import shock_history


def _synthetic(n=400, seed=1):
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 5, n)
    y = np.zeros(n)
    for t in range(2, n):
        y[t] = 0.6 * y[t - 1] + 0.05 * x[t - 1] + rng.normal(0, 0.3)
    idx = pd.period_range("1990-01", periods=n, freq="M")
    return pd.DataFrame({"yoy_headline": y, "shock": x}, index=idx)


def test_asymmetric_matches_symmetric_on_symmetric_data():
    df = _synthetic()
    spec = LPSpec(horizons=[1, 2, 3], lags_y=3, lags_x=3)
    sym = local_projections(df["yoy_headline"], df["shock"], spec).set_index("h")
    asym = local_projections_asymmetric(df["yoy_headline"], df["shock"], spec)
    up, dn = asym["up"].set_index("h"), asym["down"].set_index("h")
    # data were generated with one symmetric coefficient, so up and down should bracket it within error
    assert abs(up.loc[1, "beta"] - sym.loc[1, "beta"]) < 3 * up.loc[1, "se"]
    assert abs(dn.loc[1, "beta"] - sym.loc[1, "beta"]) < 3 * dn.loc[1, "se"]


def test_rolling_backtest_beats_no_change_on_synthetic_data():
    df = _synthetic(n=420)
    spec = LPSpec(horizons=list(range(1, 13)), lags_y=3, lags_x=3)
    res = rolling_backtest(df, "shock", "headline", spec=spec, sample_start="1990-01", origins=24, horizons=(1, 3, 6))
    assert res["origins"] >= 20
    by_h = {r["h"]: r for r in res["by_h"]}
    assert by_h[3]["rmse"] < by_h[3]["rmse_no_change"]


def test_retail_shock_history_uses_nowcast_months():
    idx = pd.period_range("2026-05", "2026-08", freq="M")
    m = pd.DataFrame({"shock_retail_fuel": [1.0, -2.0, 3.0, 0.5]}, index=idx)
    nowcast = {"retail_last_level": 37.0, "retail_months": [
        {"month": "2026-09", "retail_fuel_thb_per_litre": 39.0, "interpolated": True, "partial": False},
        {"month": "2026-10", "retail_fuel_thb_per_litre": 42.0, "interpolated": False, "partial": True}]}
    hist = shock_history(m, nowcast, "shock_retail_fuel")
    assert [h[0] for h in hist[-2:]] == ["2026-09 (interpolated)", "2026-10 (so far)"]
    assert abs(hist[-1][1] - 100 * np.log(42 / 39)) < 1e-9
