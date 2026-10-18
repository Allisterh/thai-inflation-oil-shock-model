"""End-to-end run: sync → dataset → local projections → projections → JSON/CSV outputs."""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from . import config as C
from .model import estimate_all, monthly_spec
from .projection import HOUSEHOLD_CATEGORIES, observed_shock_path, shock_history
from .sync import Dataset, build_dataset, sync_all


def _clean(obj):
    if isinstance(obj, dict):
        return {str(k): _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return None if (math.isnan(obj) or math.isinf(obj)) else round(float(obj), 5)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Period, pd.Timestamp)):
        return str(obj)
    return obj


def _irf_records(irf: pd.DataFrame) -> list[dict]:
    return [{"h": int(r.h), "beta": r.beta, "se": r.se, "lower": r.lower, "upper": r.upper, "n": int(r.n),
             "significant": bool(r.significant)} for r in irf.itertuples()]


def default_shares(weights: dict[str, float]) -> dict[str, float]:
    """Household spending shares implied by the CPI basket weights."""
    w = {k: weights.get(k, 0.0) / 100 for k in ("vehicles_fuel", "electricity_fuel_water", "public_transport", "food")}
    w["other"] = max(0.0, 1.0 - sum(w.values()))
    return w


def _daily_payload(s: pd.Series | None, days: int) -> list:
    if s is None or s.empty:
        return []
    return [[d.strftime("%Y-%m-%d"), round(float(v), 4)] for d, v in s.tail(days).items()]


def build_payload(ds: Dataset, irfs: dict) -> dict:
    m = ds.monthly
    meta = irfs["_meta"]
    last_cpi_month = m["cpi_headline"].dropna().index[-1]
    cpi_latest = {"month": str(last_cpi_month)}
    for oc in C.OUTCOMES:
        if f"yoy_{oc}" in m:
            v = m.loc[last_cpi_month, f"yoy_{oc}"]
            cpi_latest[f"{oc}_yoy"] = None if pd.isna(v) else float(v)
            cpi_latest[f"{oc}_index"] = float(m.loc[last_cpi_month, f"cpi_{oc}"])
    prev = m.loc[last_cpi_month - 1, "yoy_headline"] if (last_cpi_month - 1) in m.index else None
    cpi_latest["headline_yoy_prev"] = None if prev is None or pd.isna(prev) else float(prev)

    last_crude_month = m["dubai_usd"].dropna().index[-1]
    nc = ds.nowcast
    current = {
        "month": str(pd.Timestamp.today().to_period("M")),
        "dubai_last_month": str(last_crude_month),
        "dubai_last_usd": float(m.loc[last_crude_month, "dubai_usd"]),
        "brent_last_usd": float(m.loc[last_crude_month, "brent_usd"]) if not pd.isna(m.loc[last_crude_month, "brent_usd"]) else None,
        "dubai_last_thb_per_litre": float(m.loc[last_crude_month, "dubai_thb_per_litre"]),
        "usdthb_last_month": float(m.loc[last_crude_month, "usdthb"]),
        "nowcast": nc,
    }
    brent_d = ds.brent_daily
    changes = {}
    if brent_d is not None and len(brent_d) > 260:
        last = float(brent_d.iloc[-1])
        for label, n in (("1w", 5), ("1m", 21), ("3m", 63), ("1y", 252)):
            changes[label] = float(100 * (last / float(brent_d.iloc[-1 - n]) - 1))
    current["brent_changes_pct"] = changes
    # Shocks for the current month under both conventions, in the primary shock units.
    for mode in ("mtd", "spot"):
        hist = shock_history(m, nc, C.SHOCKS[C.PRIMARY_SHOCK], current_mode=mode)
        current[f"shock_{mode}_pct"] = hist[-1][1] if hist and "(" in hist[-1][0] else None
        current[f"shock_{mode}_label"] = hist[-1][0] if hist else None
    yoy_dubai = m["dubai_thb"].pct_change(12).iloc[-1] * 100 if len(m) > 12 else None
    current["dubai_thb_yoy_pct"] = None if yoy_dubai is None or pd.isna(yoy_dubai) else float(yoy_dubai)

    # Retail fuel
    retail = {}
    if ds.retail_daily is not None and len(ds.retail_daily):
        last = ds.retail_daily.sort_values("date").iloc[-1].to_dict()
        retail["date"] = last.pop("date"); retail["brand"] = last.pop("brand", "ptt")
        retail["prices"] = {k: (None if pd.isna(v) else float(v)) for k, v in last.items()}
    if ds.price_structure:
        retail["structure"] = ds.price_structure
    hist_cols = [c for c in ("retail_gasohol95", "retail_diesel_b7", "retail_ulg95", "retail_gasohol91") if c in m]
    retail["history"] = [{"month": str(i), **{c.replace("retail_", ""): (None if pd.isna(r[c]) else float(r[c])) for c in hist_cols}}
                         for i, r in m[hist_cols].dropna(how="all").iterrows()] if hist_cols else []

    # IRFs and observed-shock projections
    irf_payload, proj = {}, {}
    for key in C.SHOCKS:
        if key not in irfs:
            continue
        irf_payload[key] = {oc: _irf_records(irf) for oc, irf in irfs[key].items()}
        proj[key] = {}
        for mode in ("mtd", "spot"):
            hist = shock_history(m, nc, C.SHOCKS[key], current_mode=mode)
            paths = {}
            for oc, irf in irfs[key].items():
                paths[oc] = [{k: v for k, v in r.items() if k != "contributions"} for r in observed_shock_path(irf, hist)]
            proj[key][f"observed_{mode}"] = {"shocks": hist, "paths": paths}

    # Monthly data for charts (from sample start)
    start = pd.Period(meta["sample_start"], freq="M")
    keep = [c for c in m.columns if c.startswith("yoy_") or c in ("dubai_usd", "brent_usd", "usdthb", "dubai_thb_per_litre",
                                                                   "shock_dubai_thb", "shock_dubai_usd", "shock_brent_usd")]
    monthly_rows = [{"month": str(i), **{c: (None if pd.isna(r[c]) else float(r[c])) for c in keep}}
                    for i, r in m[m.index >= start][keep].iterrows()]

    return _clean({
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "model": {
            "method": "Jordà (2005) local projections, monthly, Newey–West (HAC) standard errors",
            "spec": meta["spec"], "sample_start": meta["sample_start"], "samples": meta["samples"],
            "primary_shock": C.PRIMARY_SHOCK,
            "shock_definitions": {
                "dubai_thb": "100 × Δlog(monthly Dubai crude in baht) = Dubai USD/bbl × USD/THB",
                "dubai_usd": "100 × Δlog(monthly Dubai crude, USD/bbl)",
                "brent_usd": "100 × Δlog(monthly Brent crude, USD/bbl)"},
            "outcomes": {oc: f"Thai CPI {oc.replace('_', ' ')}, year-on-year %" for oc in C.OUTCOMES},
        },
        "weights": ds.weights,
        "default_shares": default_shares(ds.weights),
        "household_categories": HOUSEHOLD_CATEGORIES,
        "current": current,
        "cpi_latest": cpi_latest,
        "retail": retail,
        "irfs": irf_payload,
        "projections": proj,
        "data": {"monthly": monthly_rows, "brent_daily": _daily_payload(brent_d, C.WEB_DAILY_DAYS),
                 "usdthb_daily": _daily_payload(ds.usdthb_daily, C.WEB_DAILY_DAYS)},
        "sources": ds.status,
    })


def run(sync: bool = True, force: bool = False, offline: bool = False, sample_start: str = C.SAMPLE_START) -> dict:
    status = sync_all(force=force, offline=offline) if sync else None
    ds = build_dataset(status)
    irfs = estimate_all(ds, monthly_spec(), sample_start=sample_start)

    C.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    for key, by_oc in irfs.items():
        if key.startswith("_"):
            continue
        frames = []
        for oc, irf in by_oc.items():
            f = irf.copy(); f.insert(0, "outcome", oc); f.insert(0, "shock", key); frames.append(f)
        if frames:
            pd.concat(frames).to_csv(C.RESULTS_DIR / f"irf_monthly_{key}.csv", index=False)
    ds.monthly.to_csv(C.RESULTS_DIR / "model_dataset_monthly.csv")
    pd.Series(ds.weights).rename("weight_pct").to_csv(C.RESULTS_DIR / "cpi_weights_tpso.csv")

    payload = build_payload(ds, irfs)
    C.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    C.LATEST_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    return payload
