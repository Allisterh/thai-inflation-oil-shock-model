"""End-to-end run: sync → dataset → local projections → projections → JSON/CSV outputs."""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from . import config as C
from .lp import LPSpec, local_projections, scenario_table
from .projection import observed_shock_path, scenario_path, shock_history
from .sync import Dataset, build_dataset, sync_all


def _clean(obj):
    """Make numpy / NaN values JSON-safe."""
    if isinstance(obj, dict):
        return {str(k): _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return None if (obj is None or math.isnan(obj) or math.isinf(obj)) else float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Period, pd.Timestamp)):
        return str(obj)
    return obj


def estimate(ds: Dataset, spec: LPSpec | None = None) -> dict[str, pd.DataFrame]:
    """Estimate the IRF for the USD-Brent shock and the baht-Brent shock."""
    spec = spec or LPSpec()
    q = ds.quarterly
    sample = q.dropna(subset=["yoy", "oil_shock_pct"])
    out = {"usd": local_projections(sample["yoy"], sample["oil_shock_pct"], spec)}
    sample_thb = q.dropna(subset=["yoy", "oil_shock_thb_pct"])
    if len(sample_thb) >= 15:
        out["thb"] = local_projections(sample_thb["yoy"], sample_thb["oil_shock_thb_pct"], spec)
    return out


def _daily_payload(s: pd.Series | None, days: int) -> list:
    if s is None or s.empty:
        return []
    tail = s.tail(days)
    return [[d.strftime("%Y-%m-%d"), round(float(v), 4)] for d, v in tail.items()]


def build_payload(ds: Dataset, irfs: dict[str, pd.DataFrame], spec: LPSpec) -> dict:
    q = ds.quarterly
    sample = q.dropna(subset=["yoy", "oil_shock_pct"])
    cpi_last = q["cpi"].dropna()
    cpi_latest = {"quarter": str(cpi_last.index[-1]), "index": float(cpi_last.iloc[-1]),
                  "yoy": float(q.loc[cpi_last.index[-1], "yoy"]) if not math.isnan(q.loc[cpi_last.index[-1], "yoy"]) else None}
    if not ds.cpi_monthly.empty:
        m = ds.cpi_monthly
        yoy_m = m.pct_change(12) * 100
        cpi_latest["monthly"] = {"month": str(m.index[-1]), "index": float(m.iloc[-1]),
                                 "yoy": None if math.isnan(yoy_m.iloc[-1]) else float(yoy_m.iloc[-1])}

    cur = dict(ds.current_quarter)
    # Baht-denominated current shock, if we have both daily series.
    if ds.brent_daily is not None and ds.usdthb_daily is not None and "prev_quarter_avg" in cur:
        prev = q.loc[pd.Period(cur["prev_quarter"], freq="Q"), "brent_thb"] if pd.Period(cur["prev_quarter"], freq="Q") in q.index else np.nan
        this_q = pd.Period(cur["quarter"], freq="Q")
        bt = (ds.brent_daily * ds.usdthb_daily.reindex(ds.brent_daily.index).ffill()).dropna()
        in_q = bt[bt.index.to_period("Q") == this_q]
        if len(in_q) and prev and not math.isnan(prev):
            cur["shock_qtd_thb_pct"] = float(100 * math.log(in_q.mean() / prev))
            cur["shock_spot_persists_thb_pct"] = float(100 * math.log(bt.iloc[-1] / prev))

    projections = {}
    for key, irf in irfs.items():
        col = "oil_shock_pct" if key == "usd" else "oil_shock_thb_pct"
        projections[key] = {
            "irf": irf.to_dict(orient="records"),
            "observed_qtd": {
                "shocks": shock_history(q, cur, col, current_mode="qtd"),
                "path": observed_shock_path(irf, shock_history(q, cur, col, current_mode="qtd")),
            },
            "observed_spot": {
                "shocks": shock_history(q, cur, col, current_mode="spot"),
                "path": observed_shock_path(irf, shock_history(q, cur, col, current_mode="spot")),
            },
            "scenarios": {str(s): scenario_path(irf, s) for s in (-20, -10, 10, 20, 30, 50)},
        }

    quarterly_rows = []
    for per, r in q.iterrows():
        quarterly_rows.append({"quarter": str(per), **{k: (None if pd.isna(v) else float(v)) for k, v in r.items()}})

    brent_d = ds.brent_daily
    changes = {}
    if brent_d is not None and len(brent_d) > 260:
        last = float(brent_d.iloc[-1])
        for label, n in (("1w", 5), ("1m", 21), ("3m", 63), ("1y", 252)):
            changes[label] = float(100 * (last / float(brent_d.iloc[-1 - n]) - 1))

    return _clean({
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "model": {
            "method": "Jordà (2005) local projections, HAC (Newey–West) SEs",
            "spec": {"horizons": spec.horizons, "lags_y": spec.lags_y, "lags_x": spec.lags_x,
                     "hac_maxlags": f"h+{spec.hac_extra_lags}", "frequency": "quarterly"},
            "sample": {"first": str(sample.index[0]), "last": str(sample.index[-1]), "n": int(len(sample))},
            "outcome": "Thailand headline CPI, YoY %",
            "shock": {"usd": "100 × Δlog(quarterly average Brent, USD/bbl)",
                      "thb": "100 × Δlog(quarterly average Brent × USD/THB)"},
        },
        "current": cur,
        "brent_changes_pct": changes,
        "cpi_latest": cpi_latest,
        "projections": projections,
        "data": {
            "quarterly": quarterly_rows,
            "brent_daily": _daily_payload(brent_d, C.WEB_DAILY_DAYS),
            "usdthb_daily": _daily_payload(ds.usdthb_daily, C.WEB_DAILY_DAYS),
        },
        "sources": ds.status,
    })


def run(sync: bool = True, force: bool = False, offline: bool = False, spec: LPSpec | None = None) -> dict:
    spec = spec or LPSpec()
    status = sync_all(force=force, offline=offline) if sync else None
    ds = build_dataset(status)
    irfs = estimate(ds, spec)

    C.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    irfs["usd"].to_csv(C.RESULTS_DIR / "irf_oil_to_cpi_quarterly.csv", index=False)
    scenario_table(irfs["usd"], [10, 20, 30]).to_csv(C.RESULTS_DIR / "scenario_impacts_oil_to_cpi_quarterly.csv", index=False)
    if "thb" in irfs:
        irfs["thb"].to_csv(C.RESULTS_DIR / "irf_oil_thb_to_cpi_quarterly.csv", index=False)
    ds.quarterly.to_csv(C.RESULTS_DIR / "model_dataset_quarterly.csv")

    payload = build_payload(ds, irfs, spec)
    C.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    C.LATEST_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=1))
    return payload
