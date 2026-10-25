"""End-to-end run: sync → dataset → local projections → projections → JSON/CSV outputs."""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from . import config as C
from .backtest import rolling_backtest
from .model import estimate_all, monthly_spec
from .projection import HOUSEHOLD_CATEGORIES, level_ahead_path, observed_shock_path, shock_history
from .sync import Dataset, build_dataset, sync_all
from .tariff import load_ft, tariff_outlook


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
    """Rows for horizons 1..H (the pages index these positionally); the h = 0 row goes out separately."""
    return [{"h": int(r.h), "beta": r.beta, "se": r.se, "lower": r.lower, "upper": r.upper, "n": int(r.n),
             "significant": bool(r.significant)} for r in irf.itertuples() if int(r.h) >= 1]


def _beta0(irf: pd.DataFrame):
    row = irf[irf["h"] == 0]
    return None if row.empty or pd.isna(row["beta"].iloc[0]) else float(row["beta"].iloc[0])


def default_shares(weights: dict[str, float]) -> dict[str, float]:
    """Household spending shares implied by the CPI basket weights."""
    w = {k: weights.get(k, 0.0) / 100 for k in ("vehicles_fuel", "electricity_fuel_water", "public_transport", "food")}
    w["other"] = max(0.0, 1.0 - sum(w.values()))
    return w


def _daily_payload(s: pd.Series | None, days: int) -> list:
    if s is None or s.empty:
        return []
    return [[d.strftime("%Y-%m-%d"), round(float(v), 4)] for d, v in s.tail(days).items()]


def _cpi_latest(frame: pd.DataFrame) -> dict:
    last = frame["cpi_headline"].dropna().index[-1]
    out = {"month": str(last)}
    for oc in C.OUTCOMES:
        if f"yoy_{oc}" in frame:
            v = frame.loc[last, f"yoy_{oc}"]
            out[f"{oc}_yoy"] = None if pd.isna(v) else float(v)
            out[f"{oc}_index"] = float(frame.loc[last, f"cpi_{oc}"]) if f"cpi_{oc}" in frame else None
    prev = frame.loc[last - 1, "yoy_headline"] if (last - 1) in frame.index else None
    out["headline_yoy_prev"] = None if prev is None or pd.isna(prev) else float(prev)
    return out


def _type_entry(frame: pd.DataFrame, by_shock: dict, weights: dict, m: pd.DataFrame, nc: dict) -> dict:
    """Compact per-household-type block: latest official inflation by item, basket weights and the
    'still to come' level paths from each model, so the page can personalise both cards."""
    entry = {"cpi_latest": _cpi_latest(frame), "weights": weights, "default_shares": default_shares(weights or {}), "projections": {}, "peak": {}}
    for key in C.COMBINED_SHOCKS:
        if key not in by_shock:
            continue
        hist = shock_history(m, nc, C.SHOCKS[key], current_mode="mtd")
        ahead, now_pp, peak = {}, {}, {}
        for oc, irf in by_shock[key].items():
            ahead[oc] = [r["level_pct"] for r in level_ahead_path(irf, hist)]
            now_pp[oc] = observed_shock_path(irf, hist[:-1])[0]["impact_pp"] if len(hist) > 1 else 0.0
            pos = irf[irf["h"] >= 1]; top = pos.loc[pos["beta"].idxmax()]
            peak[oc] = {"h": int(top["h"]), "beta": float(top["beta"])}
        entry["projections"][key] = {"level_ahead_pct": ahead, "now_pp": now_pp}
        entry["peak"][key] = peak
    return entry


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
    for mode in ("mtd", "spot"):
        if "retail_fuel" in C.SHOCKS and "shock_retail_fuel" in m:
            hist = shock_history(m, nc, "shock_retail_fuel", current_mode=mode)
            current[f"retail_shock_{mode}_pct"] = hist[-1][1] if hist and "(" in hist[-1][0] else None
    if nc.get("retail_last_level") and nc.get("retail_latest"):
        w = C.RETAIL_FUEL_WEIGHTS
        latest_level = w["diesel"] * nc["retail_latest"]["diesel_b7"] + w["gasoline"] * nc["retail_latest"]["gasohol95"]
        current["retail_fuel_change_since_last_month_pct"] = float(100 * (latest_level / nc["retail_last_level"] - 1))
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
    hist_cols = [c for c in ("retail_gasohol95", "retail_diesel_b7", "retail_ulg95", "retail_gasohol91", "retail_gasohol_e20") if c in m]
    retail["history"] = [{"month": str(i), **{c.replace("retail_", ""): (None if pd.isna(r[c]) else float(r[c])) for c in hist_cols}}
                         for i, r in m[hist_cols].dropna(how="all").iterrows()] if hist_cols else []
    # What a litre cost a year ago and three months ago (monthly averages), per product, for the "already happened" view.
    this_month = pd.Timestamp.today().to_period("M")
    comp = {}
    for col in hist_cols:
        prod = col.replace("retail_", "")
        ser = m[col].dropna()
        def _at(target):
            sub = ser[ser.index <= target]
            return (str(sub.index[-1]), float(sub.iloc[-1])) if len(sub) else (None, None)
        y_m, y_v = _at(this_month - 12); q_m, q_v = _at(this_month - 3)
        comp[prod] = {"year_ago_month": y_m, "year_ago": y_v, "three_months_ago_month": q_m, "three_months_ago": q_v}
    retail["compare"] = comp

    # IRFs and observed-shock projections
    irf_payload, irf_h0, proj = {}, {}, {}
    for key in C.SHOCKS:
        if key not in irfs:
            continue
        irf_payload[key] = {oc: _irf_records(irf) for oc, irf in irfs[key].items()}
        irf_h0[key] = {oc: _beta0(irf) for oc, irf in irfs[key].items()}
        proj[key] = {}
        for mode in ("mtd", "spot"):
            hist = shock_history(m, nc, C.SHOCKS[key], current_mode=mode)
            paths, now_pp, ahead = {}, {}, {}
            for oc, irf in irfs[key].items():
                paths[oc] = [{k: v for k, v in r.items() if k != "contributions"} for r in observed_shock_path(irf, hist)]
                now_pp[oc] = observed_shock_path(irf, hist[:-1])[0]["impact_pp"] if len(hist) > 1 else 0.0
                ahead[oc] = [r["level_pct"] for r in level_ahead_path(irf, hist)]
            proj[key][f"observed_{mode}"] = {"shocks": hist, "paths": paths, "now_pp": now_pp, "level_ahead_pct": ahead}

    # Combined estimate: average of the pump-price model and the crude model, band = envelope of both.
    a, b = C.COMBINED_SHOCKS
    if a in proj and b in proj:
        proj["combined"] = {}
        irf_payload["combined"] = {}
        for oc in irfs[a]:
            if oc not in irfs[b]:
                continue
            ra, rb = irfs[a][oc].set_index("h"), irfs[b][oc].set_index("h")
            irf_payload["combined"][oc] = [{"h": int(h), "beta": None, "se": None, "lower": None, "upper": None, "n": None,
                                            "significant": None, "note": "see the two underlying models"} for h in ra.index]
        for mode in ("mtd", "spot"):
            pa, pb = proj[a][f"observed_{mode}"]["paths"], proj[b][f"observed_{mode}"]["paths"]
            paths = {}
            for oc in pa:
                if oc not in pb:
                    continue
                paths[oc] = [{"h": x["h"], "impact_pp": (x["impact_pp"] + y["impact_pp"]) / 2,
                              "lower_pp": min(x["lower_pp"], y["lower_pp"]), "upper_pp": max(x["upper_pp"], y["upper_pp"]),
                              "retail_pp": x["impact_pp"], "crude_pp": y["impact_pp"]} for x, y in zip(pa[oc], pb[oc])]
            na, nb = proj[a][f"observed_{mode}"]["now_pp"], proj[b][f"observed_{mode}"]["now_pp"]
            la, lb = proj[a][f"observed_{mode}"]["level_ahead_pct"], proj[b][f"observed_{mode}"]["level_ahead_pct"]
            proj["combined"][f"observed_{mode}"] = {"shocks": {a: proj[a][f"observed_{mode}"]["shocks"], b: proj[b][f"observed_{mode}"]["shocks"]}, "paths": paths,
                                                    "now_pp": {oc: (na[oc] + nb[oc]) / 2 for oc in paths if oc in na and oc in nb},
                                                    "level_ahead_pct": {oc: [(x + y) / 2 for x, y in zip(la[oc], lb[oc])] for oc in paths if oc in la and oc in lb}}

    # Household types: national plus regions and the low-income index, each with its own curves.
    types = {"national": _type_entry(m, {k: irfs[k] for k in C.COMBINED_SHOCKS if k in irfs}, ds.weights, m, nc)}
    for tname, by_shock in irfs.get("_types", {}).items():
        frame = (ds.types or {}).get(tname)
        if frame is None or not by_shock:
            continue
        types[tname] = _type_entry(frame, by_shock, (ds.type_weights or {}).get(tname), m, nc)

    # Crude -> pump first stage (what-if scenarios are chained through it), current Oil Fund regime,
    # and the announced electricity tariff.
    pass_through = irfs.get("_pass_through") or {}
    tariff = tariff_outlook(load_ft())

    # Rolling pseudo-out-of-sample backtest (headline and energy) for each model and the combination.
    backtests = {}
    for key in (a, b):
        if key in irfs:
            backtests[key] = {oc: rolling_backtest(m, C.SHOCKS[key], oc, origins=C.BACKTEST_ORIGINS) for oc in ("headline", "energy")}
    if a in backtests and b in backtests:
        backtests["combined"] = {}
        for oc in ("headline", "energy"):
            ra = pd.DataFrame(backtests[a][oc]["rows"]); rb = pd.DataFrame(backtests[b][oc]["rows"])
            mm = ra.merge(rb, on=["origin", "h"], suffixes=("_a", "_b"))
            mm["projected"] = (mm["projected_a"] + mm["projected_b"]) / 2; mm["actual"] = mm["actual_a"]
            by_h = []
            for j, g in mm.groupby("h"):
                err = g["projected"] - g["actual"]
                by_h.append({"h": int(j), "n": int(len(g)), "rmse": float(np.sqrt((err ** 2).mean())), "mae": float(err.abs().mean()),
                             "bias": float(err.mean()), "rmse_no_change": float(np.sqrt((g["actual"] ** 2).mean())),
                             "corr": float(g["projected"].corr(g["actual"]))})
            backtests["combined"][oc] = {"shock": "combined", "outcome": oc, "origins": int(mm["origin"].nunique()), "by_h": by_h,
                                         "rows": mm[["origin", "h", "projected", "actual"]].round(4).to_dict(orient="records")}
    for key in backtests:  # keep only the 6-month rows for the chart to limit size (plus the 1-month rows for the prediction page)
        for oc in backtests[key]:
            if key == a and oc == "headline":
                backtests[key][oc]["rows_h1"] = [r for r in backtests[key][oc]["rows"] if r["h"] == 1]
            backtests[key][oc]["rows"] = [r for r in backtests[key][oc]["rows"] if r["h"] == 6]

    asym = {}
    for oc, pair in irfs.get("_asymmetric", {}).items():
        asym[oc] = {k: _irf_records(v) for k, v in pair.items()}

    # Monthly data for charts (from sample start)
    start = pd.Period(meta["sample_start"], freq="M")
    keep = [c for c in m.columns if c.startswith("yoy_") or c in ("dubai_usd", "brent_usd", "usdthb", "dubai_thb_per_litre",
                                                                   "shock_dubai_thb", "shock_dubai_usd", "shock_brent_usd",
                                                                   "shock_retail_fuel", "retail_fuel_thb_per_litre")]
    monthly_rows = [{"month": str(i), **{c: (None if pd.isna(r[c]) else float(r[c])) for c in keep}}
                    for i, r in m[m.index >= start][keep].iterrows()]

    return _clean({
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "model": {
            "method": "Jordà (2005) local projections, monthly, Newey–West (HAC) standard errors",
            "spec": meta["spec"], "sample_start": meta["sample_start"], "samples": meta["samples"],
            "primary_shock": C.PRIMARY_SHOCK,
            "shock_definitions": {
                "retail_fuel": "100 × Δlog(Bangkok pump price index: 0.6 diesel B7 + 0.4 gasohol 95), EPPO",
                "combined": "average of the pump-price model and the Dubai-in-baht model",
                "dubai_thb": "100 × Δlog(monthly Dubai crude in baht) = Dubai USD/bbl × USD/THB",
                "dubai_usd": "100 × Δlog(monthly Dubai crude, USD/bbl)",
                "brent_usd": "100 × Δlog(monthly Brent crude, USD/bbl)"},
            "outcomes": {oc: f"Thai CPI {oc.replace('_', ' ')}, year-on-year %" for oc in C.OUTCOMES},
            "refinements": {"food_control": meta.get("food_control", False), "regime_split": meta.get("regime_split", False),
                            "household_types": sorted(types), "scenario_chain": "crude -> pump (first-stage pass-through) -> pump-price model",
                            "electricity_override": bool(tariff and tariff.get("months_covered"))},
        },
        "types": types,
        "pass_through": pass_through,
        "regime_now": ds.regime_now,
        "electricity_tariff": tariff,
        "weights": ds.weights,
        "default_shares": default_shares(ds.weights),
        "household_categories": HOUSEHOLD_CATEGORIES,
        "current": current,
        "cpi_latest": cpi_latest,
        "retail": retail,
        "irfs": irf_payload,
        "irf_h0": irf_h0,
        "projections": proj,
        "display_default": C.DISPLAY_DEFAULT,
        "combined_of": list(C.COMBINED_SHOCKS),
        "backtests": backtests,
        "asymmetric": asym,
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
    if "_asymmetric" in irfs:
        frames = []
        for oc, pair in irfs["_asymmetric"].items():
            for direction, irf in pair.items():
                f = irf.copy(); f.insert(0, "direction", direction); f.insert(0, "outcome", oc); frames.append(f)
        pd.concat(frames).to_csv(C.RESULTS_DIR / f"irf_monthly_{C.PRIMARY_SHOCK}_asymmetric.csv", index=False)
    pd.Series(ds.weights).rename("weight_pct").to_csv(C.RESULTS_DIR / "cpi_weights_tpso.csv")

    payload = build_payload(ds, irfs)
    rows = []
    for key, by_oc in payload.get("backtests", {}).items():
        for oc, bt in by_oc.items():
            for r in bt["by_h"]:
                rows.append({"model": key, "outcome": oc, **r})
    if rows:
        pd.DataFrame(rows).to_csv(C.RESULTS_DIR / "backtest_rolling.csv", index=False)
    C.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    C.LATEST_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    # Monthly prediction and scorecard (results/predictions.csv, web/data/predictions.json).
    from .predict import run_predictions
    run_predictions(ds, backtests=payload.get("backtests"))
    # Oil Fund and pump-price tracker (web/data/fuel.json).
    from .fuel import run_fuel
    run_fuel(ds)
    return payload
