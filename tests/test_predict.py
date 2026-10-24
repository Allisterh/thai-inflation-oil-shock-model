"""Prediction and scorecard: locking rules, immutability, scoring and no look-ahead."""
import numpy as np
import pandas as pd

from thai_oil_cpi.lp import LPSpec
from thai_oil_cpi.predict import (COLUMNS, LOCKED_COLUMNS, load_predictions, predict_month, should_lock, shock_series,
                                  update_predictions)

SPEC = LPSpec(horizons=list(range(0, 7)), lags_y=3, lags_x=3)


def _frame(n=320, seed=2, last="2026-09"):
    """Synthetic monthly frame ending at ``last`` with headline inflation driven by two shocks."""
    rng = np.random.default_rng(seed)
    idx = pd.period_range(end=pd.Period(last, freq="M"), periods=n, freq="M")
    pump = rng.normal(0, 4, n); crude = pump / 0.5 + rng.normal(0, 3, n)
    y = np.zeros(n)
    for t in range(2, n):
        y[t] = 0.7 * y[t - 1] + 0.08 * pump[t] + 0.05 * pump[t - 1] + rng.normal(0, 0.2)
    return pd.DataFrame({"yoy_headline": y, "shock_retail_fuel": pump, "shock_dubai_thb": crude}, index=idx)


def _hist(df, col, extra):
    out = [(str(p), float(v)) for p, v in df[col].tail(6).items()]
    return out + extra


def test_should_lock_only_from_the_25th_or_after_the_month():
    t = pd.Period("2026-10", freq="M")
    assert not should_lock(pd.Timestamp("2026-10-01"), t)
    assert not should_lock(pd.Timestamp("2026-10-24"), t)
    assert should_lock(pd.Timestamp("2026-10-25"), t)
    assert should_lock(pd.Timestamp("2026-10-31"), t)
    assert should_lock(pd.Timestamp("2026-11-03"), t)       # month over, figure not yet published
    assert not should_lock(pd.Timestamp("2026-09-30"), t)


def test_shock_series_appends_nowcast_months_without_overriding_table_months():
    s = pd.Series([1.0, 2.0], index=pd.period_range("2026-07", "2026-08", freq="M"))
    out = shock_series(s, [("2026-08", 99.0), ("2026-09 (interpolated)", 3.0), ("2026-10 (so far)", 4.0)])
    assert out[pd.Period("2026-08", freq="M")] == 2.0
    assert list(out.index.astype(str)) == ["2026-07", "2026-08", "2026-09", "2026-10"]
    assert out.iloc[-1] == 4.0


def test_prediction_uses_no_cpi_data_for_the_target_month_or_later():
    df = _frame(last="2026-09")
    target = pd.Period("2026-09", freq="M")
    extra = []  # September's shocks are in the table already
    base = predict_month(df, _hist(df, "shock_retail_fuel", extra), _hist(df, "shock_dubai_thb", extra), SPEC, rmse1=0.5, target=target)
    # corrupt CPI for the target month and add a later month: the prediction must not move
    df2 = df.copy(); df2.loc[target, "yoy_headline"] = 50.0
    later = pd.DataFrame({"yoy_headline": [-40.0], "shock_retail_fuel": [0.0], "shock_dubai_thb": [0.0]}, index=pd.period_range("2026-10", periods=1, freq="M"))
    df2 = pd.concat([df2, later])
    again = predict_month(df2, _hist(df2, "shock_retail_fuel", extra), _hist(df2, "shock_dubai_thb", extra), SPEC, rmse1=0.5, target=target)
    for k in ("predicted", "crude_model", "no_change", "low", "high"):
        assert abs(base[k] - again[k]) < 1e-12, k
    assert base["cpi_last_month"] == "2026-08" and base["sample_end"] == "2026-08"
    assert abs(base["no_change"] - float(df.loc[pd.Period("2026-08", freq="M"), "yoy_headline"])) < 1e-12
    assert base["low"] < base["predicted"] < base["high"]


def test_locked_rows_never_change_and_scoring_fills_only_score_columns(tmp_path):
    path = tmp_path / "predictions.csv"
    df = _frame(last="2026-09")
    target = pd.Period("2026-10", freq="M")
    hist_r = _hist(df, "shock_retail_fuel", [("2026-10 (so far)", 5.0)]); hist_c = _hist(df, "shock_dubai_thb", [("2026-10 (so far)", 9.0)])
    pred = predict_month(df, hist_r, hist_c, SPEC, rmse1=0.5, target=target)
    # before the 25th: nothing is locked
    out, locked = update_predictions(path, pred, df, pd.Timestamp("2026-10-20"), "abc123", now_iso="2026-10-20T00:00:00+00:00")
    assert not locked and len(out) == 0
    # on the 27th: locked
    out, locked = update_predictions(path, pred, df, pd.Timestamp("2026-10-27"), "abc123", now_iso="2026-10-27T00:00:00+00:00")
    assert locked and len(out) == 1 and out.loc[0, "target_month"] == "2026-10" and pd.isna(out.loc[0, "actual"])
    first = load_predictions(path)   # what is on disk is what counts as locked

    def same(a, b, c):
        if c in ("target_month", "locked_at", "model_version"):
            return str(a) == str(b)
        return abs(float(a) - float(b)) < 1e-9
    # a later run with a different (drifted) prediction for the same month must not touch the locked row
    drifted = dict(pred, predicted=pred["predicted"] + 3, low=pred["low"] + 3, high=pred["high"] + 3, crude_model=pred["crude_model"] + 3)
    out, locked = update_predictions(path, drifted, df, pd.Timestamp("2026-10-29"), "def456", now_iso="2026-10-29T00:00:00+00:00")
    assert not locked and len(out) == 1
    for c in LOCKED_COLUMNS:
        assert same(out.loc[0, c], first.loc[0, c], c), c
    # the official October figure appears: only the score columns change
    df2 = pd.concat([df, pd.DataFrame({"yoy_headline": [pred["predicted"] + 0.2], "shock_retail_fuel": [5.0], "shock_dubai_thb": [9.0]},
                                       index=pd.period_range("2026-10", periods=1, freq="M"))])
    pred_nov = predict_month(df2, _hist(df2, "shock_retail_fuel", [("2026-11 (so far)", 1.0)]), _hist(df2, "shock_dubai_thb", [("2026-11 (so far)", 1.0)]), SPEC, rmse1=0.5, target=pd.Period("2026-11", freq="M"))
    out, locked = update_predictions(path, pred_nov, df2, pd.Timestamp("2026-11-06"), "ghi789", now_iso="2026-11-06T00:00:00+00:00")
    assert not locked  # November is not due yet
    row = out[out["target_month"] == "2026-10"].iloc[0]
    for c in LOCKED_COLUMNS:
        assert same(row[c], first.loc[0, c], c), c
    assert abs(float(row["actual"]) - (pred["predicted"] + 0.2)) < 1e-9
    assert abs(float(row["error"]) - (-0.2)) < 1e-9
    assert abs(float(row["no_change_error"]) - (pred["no_change"] - pred["predicted"] - 0.2)) < 1e-9
    assert row["inside_range"] == "yes" and row["actual_released_at"] == "2026-11-06T00:00:00+00:00"
    # re-running the scoring does not rewrite the release timestamp
    out, _ = update_predictions(path, pred_nov, df2, pd.Timestamp("2026-11-07"), "ghi789", now_iso="2026-11-07T00:00:00+00:00")
    assert out[out["target_month"] == "2026-10"].iloc[0]["actual_released_at"] == "2026-11-06T00:00:00+00:00"
    assert list(load_predictions(path).columns) == COLUMNS
