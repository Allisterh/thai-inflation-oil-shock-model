"""Sync every series into ``data/cache`` and assemble the monthly model dataset.

Sources (first success wins; the cache is used when every source fails):

* Thai CPI, monthly, all categories + weights : TPSO Index API (official)
* Dubai / Brent / WTI, monthly                : World Bank Pink Sheet → IMF PCPS (DBnomics)
* USD/THB, monthly                            : IMF IFS (DBnomics) extended with Yahoo daily averages
* Brent spot, daily                           : EIA dated Brent → Yahoo ICE futures
* USD/THB, daily                              : Yahoo Finance THB=X
* Thai pump prices                            : EPPO JSON (daily snapshot) + EPPO Table 9 (monthly since 2003)
* Official pump price structure               : EPPO JSON (ex-refinery, taxes, Oil Fund, margin, VAT)
"""
from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

from . import config as C
from .sources import SourceError, dbnomics, eia, eppo, tpso, worldbank, yahoo


# --------------------------------------------------------------------------
# Status bookkeeping
# --------------------------------------------------------------------------
@dataclass
class SeriesStatus:
    name: str
    source: str | None = None
    fetched_at: str | None = None
    first_obs: str | None = None
    last_obs: str | None = None
    n_obs: int = 0
    from_cache: bool = False
    errors: list[str] = field(default_factory=list)
    note: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_status() -> dict:
    if C.SYNC_STATUS_JSON.exists():
        try:
            return json.loads(C.SYNC_STATUS_JSON.read_text())
        except json.JSONDecodeError:
            pass
    return {}


def _save_status(status: dict) -> None:
    C.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    C.SYNC_STATUS_JSON.write_text(json.dumps(status, indent=2, ensure_ascii=False))


def _fresh(entry: dict | None, max_age_hours: float) -> bool:
    if not entry or not entry.get("fetched_at") or entry.get("from_cache"):
        return False
    return datetime.now(timezone.utc) - datetime.fromisoformat(entry["fetched_at"]) < timedelta(hours=max_age_hours)


# --------------------------------------------------------------------------
# Cache I/O
# --------------------------------------------------------------------------
def _write_series(path: Path, s: pd.Series, index_name: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({index_name: s.index.astype(str), "value": s.values}).to_csv(path, index=False)


def _read_daily(path: Path) -> pd.Series | None:
    if not path.exists():
        return None
    df = pd.read_csv(path)
    s = pd.Series(df["value"].values, index=pd.to_datetime(df["date"]), name="value").sort_index()
    return s


def _read_monthly_series(path: Path) -> pd.Series | None:
    if not path.exists():
        return None
    df = pd.read_csv(path)
    return pd.Series(df["value"].values, index=pd.PeriodIndex(df["month"], freq="M"), name="value").sort_index()


def _write_monthly_frame(path: Path, df: pd.DataFrame) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = df.copy()
    out.index = out.index.astype(str)
    out.index.name = "month"
    out.to_csv(path)


def _read_monthly_frame(path: Path) -> pd.DataFrame | None:
    if not path.exists():
        return None
    df = pd.read_csv(path)
    df.index = pd.PeriodIndex(df["month"], freq="M")
    return df.drop(columns="month").sort_index()


def read_tpso_cache() -> pd.DataFrame | None:
    if not C.TPSO_CPI_CSV.exists():
        return None
    df = pd.read_csv(C.TPSO_CPI_CSV, dtype={"code": str, "parent": str})
    df["month"] = pd.PeriodIndex(df["month"], freq="M")
    return df


# --------------------------------------------------------------------------
# Individual sync steps
# --------------------------------------------------------------------------
def _run(name: str, chain: list[tuple[str, Callable[[], object]]]):
    st = SeriesStatus(name=name)
    for label, fn in chain:
        try:
            obj = fn()
            st.source, st.fetched_at = label, _now_iso()
            return obj, st
        except SourceError as exc:
            st.errors.append(f"{label}: {exc}")
        except Exception as exc:  # a parser bug must not kill the sync
            st.errors.append(f"{label}: unexpected {type(exc).__name__}: {exc}")
    return None, st


def _describe(st: SeriesStatus, index) -> None:
    if len(index):
        st.first_obs, st.last_obs, st.n_obs = str(index[0])[:10], str(index[-1])[:10], int(len(index))


def _cached(name: str, st: SeriesStatus, prev: dict, obj, note: str) -> None:
    st.from_cache, st.source, st.fetched_at = True, prev.get(name, {}).get("source"), prev.get(name, {}).get("fetched_at")
    st.note = note


def sync_tpso(prev: dict, force: bool) -> SeriesStatus:
    name = "tpso_cpi"
    st = SeriesStatus(name=name)
    cached = read_tpso_cache()
    master = None
    try:
        master = tpso.fetch_master()
    except SourceError as exc:
        st.errors.append(f"master: {exc}")
    last_updated = master.get("lastUpdated") if master else None
    if cached is not None and not force and last_updated and prev.get(name, {}).get("last_updated") == last_updated:
        st.source, st.fetched_at = prev[name].get("source"), prev[name].get("fetched_at")
        st.note = "TPSO lastUpdated unchanged; cache reused"
        _describe(st, cached[cached.code == "00000"]["month"].values)
        st_dict = asdict(st); st_dict["last_updated"] = last_updated
        return st_dict
    df, st2 = _run(name, [("TPSO Index API (cpig/filter)", tpso.fetch_cpi_all)])
    st.errors += st2.errors
    if df is not None:
        st.source, st.fetched_at = st2.source, st2.fetched_at
        C.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        out = df.copy(); out["month"] = out["month"].astype(str)
        out.to_csv(C.TPSO_CPI_CSV, index=False)
        if master:
            C.TPSO_MASTER_JSON.write_text(json.dumps(master, ensure_ascii=False))
        _describe(st, df[df.code == "00000"]["month"].values)
    elif cached is not None:
        _cached(name, st, prev, cached, "TPSO unreachable; using cached copy")
        _describe(st, cached[cached.code == "00000"]["month"].values)
    st_dict = asdict(st); st_dict["last_updated"] = last_updated or prev.get(name, {}).get("last_updated")
    return st_dict


def sync_pink_sheet(prev: dict, force: bool, max_age_hours: float) -> dict:
    name = "crude_monthly"
    cached = _read_monthly_frame(C.PINK_SHEET_CSV)
    if cached is not None and not force and _fresh(prev.get(name), max_age_hours):
        st = SeriesStatus(name=name, source=prev[name]["source"], fetched_at=prev[name]["fetched_at"], note="cache is fresh")
        _describe(st, cached.index); return asdict(st)
    df, st = _run(name, [("World Bank Pink Sheet", worldbank.fetch_pink_sheet_monthly),
                         ("IMF PCPS via DBnomics", lambda: dbnomics.fetch_dubai_monthly().rename("dubai").to_frame())])
    if df is not None:
        _write_monthly_frame(C.PINK_SHEET_CSV, df); _describe(st, df.index)
        if "source_url" in df.attrs:
            st.note = df.attrs["source_url"]
    elif cached is not None:
        _cached(name, st, prev, cached, "all sources failed; using cached copy"); _describe(st, cached.index)
    return asdict(st)


def sync_fx_monthly(prev: dict, force: bool, max_age_hours: float) -> dict:
    name = "usdthb_monthly_imf"
    cached = _read_monthly_series(C.IMF_FX_CSV)
    if cached is not None and not force and _fresh(prev.get(name), max_age_hours * 6):
        st = SeriesStatus(name=name, source=prev[name]["source"], fetched_at=prev[name]["fetched_at"], note="cache is fresh")
        _describe(st, cached.index); return asdict(st)
    s, st = _run(name, [("IMF IFS via DBnomics", dbnomics.fetch_usdthb_monthly)])
    if s is not None:
        _write_series(C.IMF_FX_CSV, s, "month"); _describe(st, s.index)
    elif cached is not None:
        _cached(name, st, prev, cached, "source failed; using cached copy"); _describe(st, cached.index)
    return asdict(st)


def sync_daily(name: str, chain: list, path: Path, prev: dict, force: bool, max_age_hours: float) -> dict:
    cached = _read_daily(path)
    if cached is not None and not force and _fresh(prev.get(name), max_age_hours):
        st = SeriesStatus(name=name, source=prev[name]["source"], fetched_at=prev[name]["fetched_at"], note="cache is fresh")
        _describe(st, cached.index); return asdict(st)
    s, st = _run(name, chain)
    if s is not None and cached is not None and st.source != prev.get(name, {}).get("source") and prev.get(name, {}).get("source"):
        st.note = f"source changed from {prev[name]['source']}"
    if s is not None:
        _write_series(path, s, "date"); _describe(st, s.index)
    elif cached is not None:
        _cached(name, st, prev, cached, "source failed; using cached copy"); _describe(st, cached.index)
    return asdict(st)


def sync_eppo(prev: dict, force: bool, max_age_hours: float) -> dict:
    out = {}
    # 1. daily retail snapshot (append)
    name = "eppo_retail_daily"
    r, st = _run(name, [("EPPO oil-prices JSON", eppo.fetch_retail_prices)])
    if r is not None:
        hist = pd.read_csv(C.EPPO_RETAIL_DAILY_CSV) if C.EPPO_RETAIL_DAILY_CSV.exists() else pd.DataFrame()
        row = {"date": r["date"], "brand": r["brand"], **r["prices"]}
        hist = pd.concat([hist, pd.DataFrame([row])]).drop_duplicates("date", keep="last").sort_values("date")
        C.CACHE_DIR.mkdir(parents=True, exist_ok=True); hist.to_csv(C.EPPO_RETAIL_DAILY_CSV, index=False)
        _describe(st, hist["date"].values)
    elif C.EPPO_RETAIL_DAILY_CSV.exists():
        hist = pd.read_csv(C.EPPO_RETAIL_DAILY_CSV); _cached(name, st, prev, hist, "source failed; using cached snapshots"); _describe(st, hist["date"].values)
    out[name] = asdict(st)
    # 2. price structure (latest + history)
    name = "eppo_price_structure"
    s, st = _run(name, [("EPPO oil-structure-prices JSON", eppo.fetch_price_structure)])
    if s is not None:
        C.EPPO_STRUCTURE_JSON.write_text(json.dumps(s, ensure_ascii=False))
        rows = [{"date": s["date"], "product": p, **v} for p, v in s["products"].items()]
        hist = pd.read_csv(C.EPPO_STRUCTURE_HISTORY_CSV) if C.EPPO_STRUCTURE_HISTORY_CSV.exists() else pd.DataFrame()
        hist = pd.concat([hist, pd.DataFrame(rows)]).drop_duplicates(["date", "product"], keep="last").sort_values(["date", "product"])
        hist.to_csv(C.EPPO_STRUCTURE_HISTORY_CSV, index=False)
        st.last_obs, st.n_obs = s["date"], int(hist["date"].nunique())
    elif C.EPPO_STRUCTURE_JSON.exists():
        _cached(name, st, prev, None, "source failed; using cached structure")
        st.last_obs = json.loads(C.EPPO_STRUCTURE_JSON.read_text()).get("date")
    out[name] = asdict(st)
    # 3. monthly retail history (Table 9), weekly refresh is plenty
    name = "eppo_retail_monthly"
    cached = _read_monthly_frame(C.EPPO_RETAIL_HISTORY_CSV)
    if cached is not None and not force and _fresh(prev.get(name), max_age_hours * 6):
        st = SeriesStatus(name=name, source=prev[name]["source"], fetched_at=prev[name]["fetched_at"], note="cache is fresh"); _describe(st, cached.index)
    else:
        df, st = _run(name, [("EPPO petroleum price statistics, Table 9", eppo.fetch_retail_history)])
        if df is not None:
            _write_monthly_frame(C.EPPO_RETAIL_HISTORY_CSV, df); _describe(st, df.index)
        elif cached is not None:
            _cached(name, st, prev, cached, "source failed; using cached copy"); _describe(st, cached.index)
    out[name] = asdict(st)
    return out


def sync_all(force: bool = False, max_age_hours: float = C.DEFAULT_MAX_AGE_HOURS, offline: bool = False) -> dict:
    prev = load_status()
    if offline:
        status = dict(prev); status["synced_at"] = prev.get("synced_at"); status["offline"] = True
        return status
    status = {"synced_at": _now_iso()}
    status["tpso_cpi"] = sync_tpso(prev, force)
    status["crude_monthly"] = sync_pink_sheet(prev, force, max_age_hours)
    status["usdthb_monthly_imf"] = sync_fx_monthly(prev, force, max_age_hours)
    # Dated Brent spot (EIA) is the series the Pink Sheet's Brent and Dubai are built from, so it is the
    # consistent daily companion for the Dubai nowcast; ICE futures (Yahoo) are the fallback.
    status["brent_daily"] = sync_daily("brent_daily", [("EIA Brent spot (RBRTEd)", eia.fetch_brent_daily),
                                                       ("Yahoo Finance BZ=F futures", lambda: yahoo.fetch_daily("BZ=F", "2000-01-01"))],
                                       C.BRENT_DAILY_CSV, prev, force, max_age_hours)
    status["usdthb_daily"] = sync_daily("usdthb_daily", [("Yahoo Finance THB=X", lambda: yahoo.fetch_daily("THB=X", "2000-01-01"))],
                                        C.USDTHB_DAILY_CSV, prev, force, max_age_hours)
    status.update(sync_eppo(prev, force, max_age_hours))
    _save_status(status)
    return status


# --------------------------------------------------------------------------
# Dataset assembly
# --------------------------------------------------------------------------
@dataclass
class Dataset:
    monthly: pd.DataFrame            # complete months: CPI levels/yoy, crude, fx, shocks, retail
    cpi_long: pd.DataFrame           # TPSO long table (all categories)
    weights: dict[str, float]        # current basket weights (% of CPI) for named series
    brent_daily: pd.Series | None
    usdthb_daily: pd.Series | None
    retail_daily: pd.DataFrame | None
    price_structure: dict | None
    nowcast: dict                    # months after the last Pink Sheet month, estimated from daily Brent
    status: dict


def _monthly_mean(s: pd.Series | None) -> pd.Series:
    if s is None or s.empty:
        return pd.Series(dtype=float)
    return s.groupby(s.index.to_period("M")).mean()


def build_dataset(status: dict | None = None) -> Dataset:
    status = status or load_status()
    cpi_long = read_tpso_cache()
    if cpi_long is None:
        raise RuntimeError("No TPSO CPI data in cache. Run `python -m thai_oil_cpi sync` first.")
    cpi = tpso.wide(cpi_long)
    weights = tpso.latest_weights(cpi_long)

    crude = _read_monthly_frame(C.PINK_SHEET_CSV)
    if crude is None:
        raise RuntimeError("No crude price data in cache. Run the sync first.")
    fx_imf = _read_monthly_series(C.IMF_FX_CSV)
    brent_d = _read_daily(C.BRENT_DAILY_CSV)
    fx_d = _read_daily(C.USDTHB_DAILY_CSV)
    retail_m = _read_monthly_frame(C.EPPO_RETAIL_HISTORY_CSV)
    retail_d = pd.read_csv(C.EPPO_RETAIL_DAILY_CSV) if C.EPPO_RETAIL_DAILY_CSV.exists() else None
    structure = json.loads(C.EPPO_STRUCTURE_JSON.read_text()) if C.EPPO_STRUCTURE_JSON.exists() else None

    today = pd.Timestamp.today().normalize()
    this_month = today.to_period("M")
    last_complete_month = this_month - 1

    # Monthly FX: IMF period averages, extended with Yahoo daily averages for complete months.
    fx_yahoo_m = _monthly_mean(fx_d)
    fx_yahoo_m = fx_yahoo_m[fx_yahoo_m.index <= last_complete_month]
    fx_m = (fx_imf.copy() if fx_imf is not None else pd.Series(dtype=float))
    fx_m = fx_m.combine_first(fx_yahoo_m) if not fx_m.empty else fx_yahoo_m
    fx_note = None
    if fx_imf is not None and not fx_yahoo_m.empty:
        overlap = fx_imf.index.intersection(fx_yahoo_m.index)[-24:]
        if len(overlap):
            diff = (fx_imf[overlap] / fx_yahoo_m[overlap] - 1).abs().max() * 100
            fx_note = f"IMF vs Yahoo monthly averages differ by at most {diff:.2f}% over the last {len(overlap)} overlapping months"

    df = pd.DataFrame(index=pd.period_range(min(cpi.index[0], crude.index[0]), last_complete_month, freq="M"))
    df.index.name = "month"
    for col in cpi.columns:
        df[f"cpi_{col}"] = cpi[col]
        df[f"yoy_{col}"] = cpi[col].pct_change(12) * 100
    df["dubai_usd"] = crude["dubai"]
    if "brent" in crude:
        df["brent_usd"] = crude["brent"]
    # Fill Brent months the Pink Sheet does not have yet from daily data.
    brent_m = _monthly_mean(brent_d)
    if "brent_usd" in df:
        df["brent_usd"] = df["brent_usd"].combine_first(brent_m)
    else:
        df["brent_usd"] = brent_m
    df["usdthb"] = fx_m
    df["dubai_thb"] = df["dubai_usd"] * df["usdthb"]
    df["dubai_thb_per_litre"] = df["dubai_thb"] / C.LITRES_PER_BARREL
    df["shock_dubai_thb"] = 100 * np.log(df["dubai_thb"]).diff()
    df["shock_dubai_usd"] = 100 * np.log(df["dubai_usd"]).diff()
    df["shock_brent_usd"] = 100 * np.log(df["brent_usd"]).diff()
    if retail_m is not None:
        for col in ("gasohol95", "gasohol91", "diesel_b7", "ulg95", "gasohol_e20"):
            if col in retail_m:
                df[f"retail_{col}"] = retail_m[col]
        # Retail road-fuel price index: diesel B7 and gasoline (gasohol 95, ULG95 before gasohol existed),
        # volume-weighted, chained in logs. This is what households actually pay and it already
        # embeds Oil Fund cushioning and tax changes.
        gasoline = retail_m["gasohol95"].combine_first(retail_m["ulg95"]) if "ulg95" in retail_m else retail_m["gasohol95"]
        rf = pd.DataFrame({"diesel": retail_m["diesel_b7"], "gasoline": gasoline}).dropna()
        w = C.RETAIL_FUEL_WEIGHTS
        df["retail_fuel_thb_per_litre"] = (w["diesel"] * rf["diesel"] + w["gasoline"] * rf["gasoline"]).reindex(df.index)
        df["shock_retail_fuel"] = 100 * (w["diesel"] * np.log(rf["diesel"]).diff() + w["gasoline"] * np.log(rf["gasoline"]).diff()).reindex(df.index)

    # Nowcast: months after the last Pink Sheet month, from daily Brent × latest Dubai/Brent ratio.
    nowcast: dict = {"months": []}
    last_ps = crude.index[-1]
    ratio = float(crude["dubai"].iloc[-1] / crude["brent"].iloc[-1]) if "brent" in crude else 1.0
    nowcast["dubai_brent_ratio"] = ratio
    nowcast["ratio_month"] = str(last_ps)
    if brent_d is not None and fx_d is not None:
        fx_full_m = _monthly_mean(fx_d)
        for m in pd.period_range(last_ps + 1, this_month, freq="M"):
            b = brent_m.get(m, np.nan) if m != this_month else float(brent_d[brent_d.index.to_period("M") == m].mean())
            f = fx_full_m.get(m, np.nan)
            if math.isnan(b) or math.isnan(f):
                continue
            rec = {"month": str(m), "brent_usd": b, "dubai_usd_nowcast": b * ratio, "usdthb": f,
                   "dubai_thb_nowcast": b * ratio * f, "partial": m == this_month,
                   "days": int((brent_d.index.to_period("M") == m).sum())}
            nowcast["months"].append(rec)
        nowcast["brent_latest"] = float(brent_d.iloc[-1]); nowcast["brent_latest_date"] = str(brent_d.index[-1].date())
        nowcast["usdthb_latest"] = float(fx_d.iloc[-1]); nowcast["usdthb_latest_date"] = str(fx_d.index[-1].date())
        nowcast["dubai_spot_nowcast_usd"] = float(brent_d.iloc[-1]) * ratio
        nowcast["dubai_spot_nowcast_thb"] = float(brent_d.iloc[-1]) * ratio * float(fx_d.iloc[-1])
    if fx_note:
        nowcast["fx_note"] = fx_note

    # Retail fuel nowcast: months after the last Table 9 month, from EPPO daily snapshots (PTT Bangkok prices).
    # Months without snapshots are interpolated in logs between the last known month and the first snapshot month.
    if retail_m is not None and "retail_fuel_thb_per_litre" in df:
        last_rm = df["retail_fuel_thb_per_litre"].dropna().index[-1]
        last_level = float(df.loc[last_rm, "retail_fuel_thb_per_litre"])
        snaps = {}
        if retail_d is not None and len(retail_d):
            rd = retail_d.copy(); rd["month"] = pd.to_datetime(rd["date"]).dt.to_period("M")
            w = C.RETAIL_FUEL_WEIGHTS
            rd["fuel"] = w["diesel"] * rd["diesel_b7"] + w["gasoline"] * rd["gasohol95"]
            snaps = rd.groupby("month")["fuel"].mean().to_dict()
        months = list(pd.period_range(last_rm + 1, this_month, freq="M"))
        known = {m: snaps[m] for m in months if m in snaps and not math.isnan(snaps[m])}
        rec = []
        if known:
            first_known = min(known); prev_m, prev_v = last_rm, last_level
            for m in months:
                if m in known:
                    v = known[m]; interp = False
                elif m < first_known:
                    frac = (m - last_rm).n / (first_known - last_rm).n
                    v = math.exp(math.log(last_level) + frac * (math.log(known[first_known]) - math.log(last_level))); interp = True
                else:
                    v = prev_v; interp = True
                rec.append({"month": str(m), "retail_fuel_thb_per_litre": v, "interpolated": interp, "partial": m == this_month,
                            "days": int((rd["month"] == m).sum()) if m in known else 0})
                prev_v = v
        nowcast["retail_months"] = rec
        nowcast["retail_last_month"] = str(last_rm)
        nowcast["retail_last_level"] = last_level
        if retail_d is not None and len(retail_d):
            last_row = retail_d.sort_values("date").iloc[-1]
            nowcast["retail_latest"] = {"date": last_row["date"], "gasohol95": float(last_row["gasohol95"]), "diesel_b7": float(last_row["diesel_b7"])}

    return Dataset(monthly=df, cpi_long=cpi_long, weights=weights, brent_daily=brent_d, usdthb_daily=fx_d,
                   retail_daily=retail_d, price_structure=structure, nowcast=nowcast, status=status)
