import numpy as np
import pandas as pd

from thai_oil_cpi import config as C
from thai_oil_cpi.projection import household_costs, observed_shock_path, pump_price_change, scenario_path
from thai_oil_cpi.sync import make_cpi_validator, read_seed_quarterly


def _irf():
    return pd.DataFrame({"h": [1, 2, 3], "beta": [0.1, 0.05, 0.02], "se": [0.01, 0.01, 0.01]})


def test_seed_brent_labels_are_monotonic_after_repair():
    s = read_seed_quarterly(C.SEED_BRENT_XLSX, "Brent_Oil_USD_per_Barrel")
    assert s.index.is_monotonic_increasing and s.index.is_unique
    assert pd.Period("2024Q4", freq="Q") in s.index


def test_cpi_validator_rejects_vintage_mix():
    seed = pd.Series([100.0, 101.0, 102.0, 103.0], index=pd.period_range("2024Q1", periods=4, freq="Q"))
    months = pd.period_range("2024-01", periods=12, freq="M")
    good = pd.Series(np.repeat([100.0, 101.0, 102.0, 103.0], 3), index=months)
    bad = good.copy(); bad.iloc[-3:] = 110.0
    validate = make_cpi_validator(seed)
    assert validate(good) is None
    assert "differ" in validate(bad)


def test_observed_shock_path_sums_convolution():
    irf = _irf()
    path = observed_shock_path(irf, [("q-1", 10.0), ("q0", 20.0)])
    # j=1: beta1*20 + beta2*10 ; j=2: beta2*20 + beta3*10 ; j=3: beta3*20
    assert abs(path[0]["impact_pp"] - (0.1 * 20 + 0.05 * 10)) < 1e-12
    assert abs(path[1]["impact_pp"] - (0.05 * 20 + 0.02 * 10)) < 1e-12
    assert abs(path[2]["impact_pp"] - 0.02 * 20) < 1e-12


def test_household_and_pump():
    path = scenario_path(_irf(), 10)
    hh = household_costs(path, 20000)
    assert abs(hh["by_horizon"][0]["extra_thb_per_month"] - 20000 * 1.0 / 100) < 1e-9
    assert hh["year1_total_thb"] > 0
    pump = pump_price_change(80, 100, 33.0, pass_through=1.0)
    assert abs(pump["delta_thb_per_litre"] - 20 * 33 / C.LITRES_PER_BARREL) < 1e-9
