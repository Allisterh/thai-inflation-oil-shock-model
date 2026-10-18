import pandas as pd

from thai_oil_cpi import config as C
from thai_oil_cpi.projection import household_breakdown, observed_shock_path, pump_price_change, scenario_path, shock_history


def _irf():
    return pd.DataFrame({"h": [1, 2, 3], "beta": [0.1, 0.05, 0.02], "se": [0.01, 0.01, 0.01]})


def test_observed_shock_path_convolution():
    path = observed_shock_path(_irf(), [("m-1", 10.0), ("m0", 20.0)])
    assert abs(path[0]["impact_pp"] - (0.1 * 20 + 0.05 * 10)) < 1e-12
    assert abs(path[1]["impact_pp"] - (0.05 * 20 + 0.02 * 10)) < 1e-12
    assert abs(path[2]["impact_pp"] - 0.02 * 20) < 1e-12


def test_shock_history_chains_nowcast_months():
    idx = pd.period_range("2026-06", "2026-09", freq="M")
    m = pd.DataFrame({"dubai_thb": [2000.0, 2100.0, 2200.0, 2300.0]}, index=idx)
    m["shock_dubai_thb"] = 100 * (m["dubai_thb"] / m["dubai_thb"].shift(1)).apply(lambda x: __import__("math").log(x) if x == x else float("nan"))
    nowcast = {"months": [{"month": "2026-10", "dubai_thb_nowcast": 2415.0, "partial": True}], "dubai_spot_nowcast_thb": 2530.0}
    mtd = shock_history(m, nowcast, "shock_dubai_thb", current_mode="mtd")
    spot = shock_history(m, nowcast, "shock_dubai_thb", current_mode="spot")
    assert mtd[-1][0] == "2026-10 (so far)" and abs(mtd[-1][1] - 100 * __import__("math").log(2415 / 2300)) < 1e-9
    assert spot[-1][0] == "2026-10 (spot held)" and spot[-1][1] > mtd[-1][1]
    assert len(mtd) == 4  # three complete-month shocks + the nowcast


def test_household_breakdown_and_pump():
    irfs = {"vehicles_fuel": _irf(), "food": _irf(), "core": _irf(), "electricity_fuel_water": _irf(), "public_transport": _irf()}
    paths = {k: scenario_path(v, 10) for k, v in irfs.items()}
    hh = household_breakdown(irfs, paths, 20000, {"vehicles_fuel": 0.2, "electricity_fuel_water": 0.05, "public_transport": 0.02, "food": 0.4, "other": 0.33})
    # every category has the same IRF here, so the total equals spend × impact
    assert abs(hh["total_by_h"][0] - 20000 * 1.0 / 100) < 1e-9
    assert hh["peak_h"] == 1
    pump = pump_price_change(3000.0, 3300.0, pass_through=1.0)
    assert abs(pump["delta_pump_thb_per_litre"] - 300 / C.LITRES_PER_BARREL * (1 + C.VAT_RATE)) < 1e-9


def test_level_irf_uses_same_month_response():
    """A shock fully in prices in its own month: β_0..β_11 = 1, β_12.. = 0 must give a flat level path."""
    import pandas as pd
    from thai_oil_cpi.projection import level_irf, level_ahead_path
    rows = [{"h": h, "beta": 1.0 if h < 12 else 0.0, "se": 0.1} for h in range(0, 25)]
    irf = pd.DataFrame(rows)
    psi = level_irf(irf)
    assert all(abs(psi[h] - 1.0) < 1e-12 for h in range(0, 25))
    # nothing further to come from a shock that is already fully in prices
    ahead = level_ahead_path(irf, [("2026-04", 29.0)], horizons_ahead=12)
    assert all(abs(r["level_pct"]) < 1e-9 for r in ahead)
