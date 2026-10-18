"""The estimator must reproduce the IRF the notebook originally published (kept as a fixture)."""
from pathlib import Path

import numpy as np
import pandas as pd

from thai_oil_cpi.lp import LPSpec, local_projections, scenario_table

ROOT = Path(__file__).resolve().parent.parent


def _notebook_dataset():
    brent = pd.read_excel(ROOT / "data/brent_quarterly.xlsx")
    cpi = pd.read_excel(ROOT / "data/thai_cpi_quarterly.xlsx")
    brent["Date"] = brent["Date"].str.upper()
    cpi["Date"] = cpi["Date"].str.upper()
    key = lambda s: s.map(lambda q: (int(q[:4]), int(q[-1])))
    brent = brent.sort_values("Date", key=key).reset_index(drop=True)
    cpi = cpi.sort_values("Date", key=key).reset_index(drop=True)
    cpi["yoy"] = cpi["CPI_Index"].pct_change(4) * 100
    df = pd.merge(brent, cpi, on="Date", how="inner")
    # The published results were estimated before the Brent file's 2024-Q4 row
    # (mislabelled "2025-Q4") was repaired, so that quarter was absent. Drop it
    # here so the test checks the estimator, not the data fix.
    df = df[df["Date"] != "2024-Q4"]
    df["shock"] = 100 * np.log(df["Brent_Oil_USD_per_Barrel"]).diff()
    return df.dropna(subset=["yoy", "shock"]).reset_index(drop=True)


def test_reproduces_published_irf():
    df = _notebook_dataset()
    irf = local_projections(df["yoy"], df["shock"], LPSpec())
    published = pd.read_csv(ROOT / "tests/fixtures/irf_published_original.csv")
    assert list(irf["h"]) == list(published["h"])
    np.testing.assert_allclose(irf["beta"].values, published["beta"].values, rtol=1e-8)
    np.testing.assert_allclose(irf["se"].values, published["se"].values, rtol=1e-8)
    assert list(irf["n"]) == list(published["n"])


def test_scenario_table_scales_linearly():
    df = _notebook_dataset()
    irf = local_projections(df["yoy"], df["shock"])
    tab = scenario_table(irf, [10, 20])
    row10 = tab[(tab["Shock_%"] == 10) & (tab["Horizon_q"] == 1)].iloc[0]
    row20 = tab[(tab["Shock_%"] == 20) & (tab["Horizon_q"] == 1)].iloc[0]
    assert abs(row20["CPI_Impact_pp"] - 2 * row10["CPI_Impact_pp"]) < 1e-12
