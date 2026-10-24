"""Monthly headline-inflation prediction and public scorecard.

Before the Ministry of Commerce publishes month M's headline inflation, the pipeline publishes the
model's prediction for M: last month's year-on-year rate plus the oil-driven change from M−1 to M
from the pump-price model (``backtest._oil_component``), estimated on data up to M−1. This is the
same calculation the one-month backtest scores, so the published one-month error applies to it.

Predictions are locked on the first run on or after the 25th of month M (Bangkok date), once most of
the month's pump prices are known, and appended to ``results/predictions.csv``. A locked row is never
changed except to fill in the official figure and the errors when that figure first appears.
"""
from __future__ import annotations

import math
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

from . import config as C
from .backtest import _oil_component
from .lp import LPSpec, local_projections

BANGKOK = ZoneInfo("Asia/Bangkok")
LOCK_DAY = 25
COLUMNS = ["target_month", "locked_at", "predicted", "low", "high", "no_change", "crude_model", "model_version",
           "actual", "actual_released_at", "error", "no_change_error", "inside_range"]
LOCKED_COLUMNS = ["target_month", "locked_at", "predicted", "low", "high", "no_change", "crude_model", "model_version"]
SCORE_COLUMNS = ["actual", "actual_released_at", "error", "no_change_error", "inside_range"]
PREDICTIONS_CSV = C.RESULTS_DIR / "predictions.csv"
PREDICTIONS_JSON = C.WEB_DATA_DIR / "predictions.json"
CSV_URL = "https://github.com/thaileetrakul27/thai-inflation-oil-shock-model/blob/main/results/predictions.csv"


def today_bangkok() -> pd.Timestamp:
    return pd.Timestamp(datetime.now(BANGKOK).date())


def model_version() -> str:
    sha = os.environ.get("GITHUB_SHA")
    if sha:
        return sha[:12]
    try:
        return subprocess.check_output(["git", "rev-parse", "--short=12", "HEAD"], cwd=C.ROOT, text=True, stderr=subprocess.DEVNULL).strip() or "local"
    except Exception:
        return "local"


def shock_series(column: pd.Series, history: list[tuple[str, float]]) -> pd.Series:
    """Monthly shock series with nowcast months (labels like '2026-10 (so far)') appended. Published
    table months are never overridden by a nowcast value."""
    s = column.dropna().astype(float).copy()
    extra = {}
    for label, value in history or []:
        p = pd.Period(str(label)[:7], freq="M")
        if p not in s.index and value is not None and not math.isnan(float(value)):
            extra[p] = float(value)
    if extra:
        s = pd.concat([s, pd.Series(extra)]).sort_index()
    return s


def should_lock(today: pd.Timestamp, target: pd.Period) -> bool:
    """Lock on or after the 25th of the target month, or any time after the month has ended."""
    tp = pd.Timestamp(today).to_period("M")
    return tp > target or (tp == target and pd.Timestamp(today).day >= LOCK_DAY)


def predict_month(monthly: pd.DataFrame, retail_history: list, crude_history: list, spec: LPSpec | None = None,
                  rmse1: float | None = None, target: pd.Period | None = None) -> dict:
    """Prediction for ``target`` (default: the month after the last published CPI month).

    Only CPI data up to target−1 is used: the frame is truncated before estimation and the
    'no change' base is the year-on-year rate at target−1. Shocks run through ``target`` (the
    month-to-date pump-price shock for the target month comes from ``retail_history``).
    """
    spec = spec or LPSpec(horizons=list(C.HORIZONS_M), lags_y=C.LAGS_M, lags_x=C.LAGS_M, hac_extra_lags=C.HAC_EXTRA_LAGS)
    y_all = monthly["yoy_headline"].dropna()
    target = pd.Period(target, freq="M") if target is not None else y_all.index[-1] + 1
    prev = target - 1
    fit = monthly[monthly.index <= prev]
    if prev not in fit.index or pd.isna(fit.loc[prev, "yoy_headline"]):
        raise ValueError(f"no published headline inflation for {prev}")
    y_prev = float(fit.loc[prev, "yoy_headline"])
    start = pd.Period(C.SAMPLE_START, freq="M")
    out = {"target_month": str(target), "cpi_last_month": str(prev), "no_change": y_prev, "sample_end": None}
    for key, col, hist in (("predicted", C.SHOCKS["retail_fuel"], retail_history), ("crude_model", C.SHOCKS["dubai_thb"], crude_history)):
        sample = fit[fit.index >= start][["yoy_headline", col]].dropna()
        irf = local_projections(sample["yoy_headline"], sample[col], spec)
        x = shock_series(monthly[col], hist)
        delta = _oil_component(irf, x, target) - _oil_component(irf, x, prev)
        out[key] = y_prev + delta
        out[f"{key}_oil_change"] = delta
        if key == "predicted":
            out["sample_end"] = str(sample.index[-1])
            lab = next((l for l, v in (hist or []) if str(l)[:7] == str(target)), None)
            out["shock_target_month"] = float(x[target]) if target in x.index else None
            out["shock_target_label"] = lab or (str(target) if target in x.index else None)
    out["rmse1"] = rmse1
    out["low"] = out["predicted"] - rmse1 if rmse1 is not None else None
    out["high"] = out["predicted"] + rmse1 if rmse1 is not None else None
    return out


def _empty() -> pd.DataFrame:
    return pd.DataFrame({c: pd.Series(dtype="object") for c in COLUMNS})


def load_predictions(path: Path = PREDICTIONS_CSV) -> pd.DataFrame:
    if not Path(path).exists():
        return _empty()
    df = pd.read_csv(path, dtype={"target_month": str, "locked_at": str, "model_version": str, "actual_released_at": str, "inside_range": str})
    for c in COLUMNS:
        if c not in df:
            df[c] = None
    return df[COLUMNS]


def update_predictions(path: Path, prediction: dict, monthly: pd.DataFrame, today: pd.Timestamp,
                       version: str, now_iso: str | None = None) -> tuple[pd.DataFrame, bool]:
    """Score rows whose official figure has appeared, then lock this month's prediction if due.

    Locked columns are never rewritten: scoring only fills the five score columns on rows where
    ``actual`` is still empty, and locking only appends a row for a target month not yet present.
    Returns (table, locked_now).
    """
    now_iso = now_iso or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    df = load_predictions(path)
    y = monthly["yoy_headline"].dropna()
    for i in df.index:
        if pd.notna(df.at[i, "actual"]) and str(df.at[i, "actual"]) != "":
            continue
        tm = pd.Period(str(df.at[i, "target_month"]), freq="M")
        if tm in y.index:
            actual = float(y[tm])
            pred, low, high, nc = (float(df.at[i, c]) for c in ("predicted", "low", "high", "no_change"))
            df.at[i, "actual"] = actual
            df.at[i, "actual_released_at"] = now_iso
            df.at[i, "error"] = pred - actual
            df.at[i, "no_change_error"] = nc - actual
            df.at[i, "inside_range"] = "yes" if low <= actual <= high else "no"
    locked_now = False
    target = pd.Period(prediction["target_month"], freq="M")
    if should_lock(today, target) and str(target) not in set(df["target_month"].astype(str)):
        row = {c: None for c in COLUMNS}
        row.update({"target_month": str(target), "locked_at": now_iso, "predicted": prediction["predicted"], "low": prediction["low"],
                    "high": prediction["high"], "no_change": prediction["no_change"], "crude_model": prediction["crude_model"], "model_version": version})
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        locked_now = True
    df = df.sort_values("target_month").reset_index(drop=True)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)   # full precision, so a re-read reproduces the locked values exactly
    return df, locked_now


def _f(v):
    try:
        x = float(v)
        return None if math.isnan(x) else x
    except (TypeError, ValueError):
        return None


def summary(df: pd.DataFrame) -> dict:
    scored = df[df["actual"].notna() & (df["actual"].astype(str) != "")]
    if scored.empty:
        return {"n_locked": int(len(df)), "n_scored": 0}
    err = scored["error"].astype(float).abs(); nce = scored["no_change_error"].astype(float).abs()
    return {"n_locked": int(len(df)), "n_scored": int(len(scored)), "mae": float(err.mean()), "mae_no_change": float(nce.mean()),
            "hits": int((scored["inside_range"].astype(str) == "yes").sum()),
            "beat_no_change": int((err < nce).sum()), "ties": int((err == nce).sum())}


def backtest_section(csv_path: Path = C.RESULTS_DIR / "backtest_rolling.csv", rows_h1: list | None = None) -> dict:
    out = {"source": "results/backtest_rolling.csv", "by_h": [], "rows_h1": rows_h1 or []}
    if Path(csv_path).exists():
        bt = pd.read_csv(csv_path)
        sel = bt[(bt["model"] == "retail_fuel") & (bt["outcome"] == "headline")]
        out["by_h"] = [{k: (_f(r[k]) if k not in ("h", "n") else int(r[k])) for k in ("h", "n", "rmse", "mae", "bias", "rmse_no_change", "corr")} for _, r in sel.iterrows()]
    return out


def run_predictions(ds, backtests: dict | None = None, today: pd.Timestamp | None = None, csv_path: Path = PREDICTIONS_CSV,
                    json_path: Path = PREDICTIONS_JSON, write: bool = True) -> dict:
    """Pipeline entry point: predict, score, lock if due, write results/predictions.csv and
    web/data/predictions.json."""
    from .projection import shock_history
    today = pd.Timestamp(today) if today is not None else today_bangkok()
    m, nc = ds.monthly, ds.nowcast
    retail_hist = shock_history(m, nc, C.SHOCKS["retail_fuel"], current_mode="mtd")
    crude_hist = shock_history(m, nc, C.SHOCKS["dubai_thb"], current_mode="mtd")
    rmse1, rows_h1 = None, []
    bt = (backtests or {}).get("retail_fuel", {}).get("headline")
    if bt:
        r1 = next((r for r in bt.get("by_h", []) if r["h"] == 1), None)
        rmse1 = float(r1["rmse"]) if r1 else None
        rows_h1 = bt.get("rows_h1", [])
    if rmse1 is None:
        sec = backtest_section()
        r1 = next((r for r in sec["by_h"] if r["h"] == 1), None)
        rmse1 = r1["rmse"] if r1 else None
    pred = predict_month(m, retail_hist, crude_hist, rmse1=rmse1)
    df, locked_now = update_predictions(csv_path, pred, m, today, model_version()) if write else (load_predictions(csv_path), False)
    target = pd.Period(pred["target_month"], freq="M")
    locked_rows = df[df["target_month"].astype(str) == str(target)]
    locked_row = {c: (_f(locked_rows.iloc[0][c]) if c not in ("target_month", "locked_at", "model_version", "actual_released_at", "inside_range") else (None if pd.isna(locked_rows.iloc[0][c]) else str(locked_rows.iloc[0][c]))) for c in COLUMNS} if len(locked_rows) else None
    rows = []
    for _, r in df.iterrows():
        rows.append({c: (_f(r[c]) if c not in ("target_month", "locked_at", "model_version", "actual_released_at", "inside_range") else (None if pd.isna(r[c]) else str(r[c]))) for c in COLUMNS})
    payload = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "as_of_date": str(today.date()),
        "target_month": str(target), "cpi_last_month": pred["cpi_last_month"], "official_due_month": str(target + 1),
        "lock_day": LOCK_DAY, "lock_date": str(pd.Timestamp(target.start_time.year, target.start_time.month, LOCK_DAY).date()),
        "locked": locked_row is not None, "locked_now": locked_now, "locked_row": locked_row,
        "current": {"predicted": pred["predicted"], "low": pred["low"], "high": pred["high"], "no_change": pred["no_change"], "crude_model": pred["crude_model"],
                    "oil_change": pred["predicted_oil_change"], "crude_oil_change": pred["crude_model_oil_change"], "rmse1": rmse1,
                    "shock_target_month": pred.get("shock_target_month"), "shock_target_label": pred.get("shock_target_label"), "sample_end": pred["sample_end"]},
        "sources": {"cpi": "TPSO (Ministry of Commerce) headline CPI, year-on-year", "pump": "EPPO Bangkok pump prices (Table 9 and daily feed)",
                    "crude": "World Bank Pink Sheet Dubai, EIA Brent spot, ECB USD/THB", "rmse": "results/backtest_rolling.csv, pump-price model, h = 1"},
        "rows": rows, "summary": summary(df), "backtest": backtest_section(rows_h1=rows_h1), "csv_url": CSV_URL,
        "model_version": model_version(),
    }
    if write:
        Path(json_path).parent.mkdir(parents=True, exist_ok=True)
        import json
        Path(json_path).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    return payload
