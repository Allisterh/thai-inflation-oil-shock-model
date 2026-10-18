"""Sync external data into ``data/cache`` and build the quarterly model dataset.

Source chains (first success wins; the cache is used when every source fails):

* Brent daily   : Yahoo Finance ``BZ=F`` (ICE front-month futures; this matches
                  the curated quarterly file almost exactly) → EIA Brent spot
                  spreadsheet → FRED ``DCOILBRENTEU``.
* USD/THB daily : Yahoo Finance ``THB=X`` → FRED ``DEXTHUS``.
* Thai CPI      : ``data/thai_cpi_monthly_manual.csv`` (maintainer-updated
                  from the Ministry of Commerce monthly release) → ``THAI_CPI_URL``
                  env var (any date,value CSV) → FRED ``THACPIALLMINMEI``
                  → DBnomics IMF ``M.TH.PCPI_IX``. Every external CPI feed is
                  validated against the curated quarterly series before use.

The curated quarterly spreadsheets in ``data/`` are always the base of the
CPI series; external monthly feeds only extend it forward.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

from . import config as C
from . import sources as S

QUARTER_RE = re.compile(r"^(\d{4})\s*-?\s*Q([1-4])$", re.IGNORECASE)


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


def _load_status() -> dict:
    if C.SYNC_STATUS_JSON.exists():
        try:
            return json.loads(C.SYNC_STATUS_JSON.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _save_status(status: dict) -> None:
    C.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    C.SYNC_STATUS_JSON.write_text(json.dumps(status, indent=2))


def _cache_fresh(name: str, status: dict, max_age_hours: float) -> bool:
    entry = status.get(name)
    if not entry or not entry.get("fetched_at") or entry.get("from_cache"):
        return False
    fetched = datetime.fromisoformat(entry["fetched_at"])
    return datetime.now(timezone.utc) - fetched < timedelta(hours=max_age_hours)


# --------------------------------------------------------------------------
# Cache I/O
# --------------------------------------------------------------------------
def _write_daily(path: Path, s: pd.Series) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    s.rename("value").to_frame().rename_axis("date").to_csv(path, date_format="%Y-%m-%d")


def _read_daily(path: Path) -> pd.Series | None:
    if not path.exists():
        return None
    df = pd.read_csv(path, parse_dates=["date"])
    return pd.Series(df["value"].values, index=df["date"], name="value").sort_index()


def _write_monthly(path: Path, s: pd.Series) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"date": s.index.astype(str), "value": s.values}).to_csv(path, index=False)


def _read_monthly(path: Path) -> pd.Series | None:
    if not path.exists():
        return None
    return S.monthly_series_from_frame(pd.read_csv(path))


# --------------------------------------------------------------------------
# Curated seed series
# --------------------------------------------------------------------------
def normalize_quarter(label) -> str:
    m = QUARTER_RE.match(str(label).strip().upper())
    if not m:
        raise ValueError(f"Bad quarter label: {label!r}")
    return f"{m.group(1)}-Q{m.group(2)}"


def _quarter_period(label: str) -> pd.Period:
    y, q = normalize_quarter(label).split("-Q")
    return pd.Period(year=int(y), quarter=int(q), freq="Q")


def read_seed_quarterly(path: Path, value_col: str) -> pd.Series:
    """Read a curated quarterly spreadsheet into a Series on a quarterly PeriodIndex.

    If labels are out of order the file is assumed to be chronological and the
    offending label is repaired (the shipped Brent file labels 2024-Q4 as
    2025-Q4); the repair is logged via ``read_seed_quarterly.repairs``.
    """
    df = pd.read_excel(path)
    periods = [_quarter_period(x) for x in df["Date"]]
    repairs: list[str] = []
    for i in range(1, len(periods)):
        expected = periods[i - 1] + 1
        if periods[i] != expected and (i + 1 < len(periods) and periods[i + 1] == expected + 1):
            repairs.append(f"{path.name}: row {i} labelled {periods[i]} read as {expected}")
            periods[i] = expected
    read_seed_quarterly.repairs = repairs  # type: ignore[attr-defined]
    s = pd.Series(pd.to_numeric(df[value_col], errors="coerce").values,
                  index=pd.PeriodIndex(periods, freq="Q")).dropna()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    return s


read_seed_quarterly.repairs = []  # type: ignore[attr-defined]


# --------------------------------------------------------------------------
# Fetch helpers with fall-through
# --------------------------------------------------------------------------
def _try_sources(name: str, chain: list[tuple[str, Callable[[], pd.Series]]],
                 validate: Callable[[pd.Series], str | None] | None = None) -> tuple[pd.Series | None, SeriesStatus]:
    st = SeriesStatus(name=name)
    for label, fn in chain:
        try:
            s = fn()
            if validate is not None:
                problem = validate(s)
                if problem:
                    st.errors.append(f"{label}: rejected ({problem})")
                    continue
            st.source = label
            st.fetched_at = _now_iso()
            st.first_obs, st.last_obs, st.n_obs = str(s.index[0]), str(s.index[-1]), int(len(s))
            return s, st
        except S.SourceError as exc:
            st.errors.append(f"{label}: {exc}")
        except Exception as exc:  # defensive: a parser bug must not kill the sync
            st.errors.append(f"{label}: unexpected {type(exc).__name__}: {exc}")
    return None, st


def _finish_with_cache(name: str, s: pd.Series | None, st: SeriesStatus, cache_reader, status: dict) -> pd.Series | None:
    if s is not None:
        return s
    cached = cache_reader()
    prev = status.get(name, {})
    if cached is not None:
        st.from_cache = True
        st.source = prev.get("source")
        st.fetched_at = prev.get("fetched_at")
        st.first_obs, st.last_obs, st.n_obs = str(cached.index[0]), str(cached.index[-1]), int(len(cached))
        st.note = "all sources failed; using cached copy"
    return cached


# --------------------------------------------------------------------------
# Public sync
# --------------------------------------------------------------------------
def sync_daily_series(name: str, chain, cache_path: Path, status: dict, force: bool, max_age_hours: float) -> tuple[pd.Series | None, SeriesStatus]:
    if not force and _cache_fresh(name, status, max_age_hours):
        cached = _read_daily(cache_path)
        if cached is not None:
            st = SeriesStatus(**{k: v for k, v in status[name].items() if k in SeriesStatus.__dataclass_fields__})
            st.note = "cache is fresh; skipped fetch"
            return cached, st
    s, st = _try_sources(name, chain)
    if s is not None:
        _write_daily(cache_path, s)
    s = _finish_with_cache(name, s, st, lambda: _read_daily(cache_path), status)
    return s, st


def make_cpi_validator(seed_q: pd.Series):
    """Reject a monthly feed whose quarterly averages disagree with the curated series."""
    def validate(s: pd.Series) -> str | None:
        if not isinstance(s.index, pd.PeriodIndex) or s.index.freqstr not in ("M", "ME"):
            return "not a monthly series"
        q = s.groupby(s.index.asfreq("Q")).mean()
        counts = s.groupby(s.index.asfreq("Q")).size()
        q = q[counts == 3]
        overlap = q.index.intersection(seed_q.index)
        if len(overlap) == 0:
            return "no overlap with curated series to validate against"
        overlap = overlap[-C.CPI_VALIDATION_QUARTERS:]
        pct = ((q[overlap] / seed_q[overlap]) - 1).abs() * 100
        if (pct > C.CPI_VALIDATION_TOL_PCT).any():
            worst = pct.idxmax()
            return (f"quarterly averages differ from curated data by up to {pct.max():.2f}% "
                    f"(at {worst}); tolerance {C.CPI_VALIDATION_TOL_PCT}%")
        return None
    return validate


def sync_cpi(seed_q: pd.Series, status: dict, force: bool, max_age_hours: float) -> tuple[pd.Series | None, SeriesStatus]:
    name = "thai_cpi_monthly"
    if not force and _cache_fresh(name, status, max_age_hours):
        cached = _read_monthly(C.CPI_MONTHLY_CSV)
        if cached is not None:
            st = SeriesStatus(**{k: v for k, v in status[name].items() if k in SeriesStatus.__dataclass_fields__})
            st.note = "cache is fresh; skipped fetch"
            return cached, st
    validate = make_cpi_validator(seed_q)
    chain: list[tuple[str, Callable[[], pd.Series]]] = []
    if C.MANUAL_CPI_CSV.exists():
        chain.append(("manual_csv", lambda: S.monthly_series_from_frame(pd.read_csv(C.MANUAL_CPI_CSV))))
    url = os.environ.get("THAI_CPI_URL")
    if url:
        chain.append(("THAI_CPI_URL", lambda: S.fetch_csv_url_monthly(url)))
    chain.append(("FRED:THACPIALLMINMEI", lambda: _fred_monthly("THACPIALLMINMEI")))
    chain.append(("DBnomics:IMF/CPI/M.TH.PCPI_IX", lambda: S.fetch_dbnomics_series("IMF", "CPI", "M.TH.PCPI_IX")))
    s, st = _try_sources(name, chain, validate=validate)
    if s is not None:
        _write_monthly(C.CPI_MONTHLY_CSV, s)
    s = _finish_with_cache(name, s, st, lambda: _read_monthly(C.CPI_MONTHLY_CSV), status)
    if s is None:
        st.note = "no validated external CPI feed; using curated quarterly series only"
    return s, st


def _fred_monthly(series_id: str) -> pd.Series:
    s = S.fetch_fred_csv(series_id)
    s.index = pd.PeriodIndex(s.index, freq="M")
    s = s[~s.index.duplicated(keep="last")]
    return s


def sync_all(force: bool = False, max_age_hours: float = C.DEFAULT_MAX_AGE_HOURS, offline: bool = False) -> dict:
    """Fetch/refresh every series. Returns the status dict (also written to cache)."""
    status = _load_status()
    seed_brent = read_seed_quarterly(C.SEED_BRENT_XLSX, "Brent_Oil_USD_per_Barrel")
    brent_repairs = list(read_seed_quarterly.repairs)
    seed_cpi = read_seed_quarterly(C.SEED_CPI_XLSX, "CPI_Index")

    if offline:
        brent = _read_daily(C.BRENT_DAILY_CSV); fx = _read_daily(C.USDTHB_DAILY_CSV); cpi_m = _read_monthly(C.CPI_MONTHLY_CSV)
        st_b = SeriesStatus("brent_daily", note="offline", from_cache=brent is not None)
        st_f = SeriesStatus("usdthb_daily", note="offline", from_cache=fx is not None)
        st_c = SeriesStatus("thai_cpi_monthly", note="offline", from_cache=cpi_m is not None)
    else:
        brent, st_b = sync_daily_series(
            "brent_daily",
            [("yahoo:BZ=F", lambda: S.fetch_yahoo_daily("BZ=F")),
             ("eia:RBRTEd", S.fetch_eia_brent_daily),
             ("fred:DCOILBRENTEU", lambda: S.fetch_fred_csv("DCOILBRENTEU"))],
            C.BRENT_DAILY_CSV, status, force, max_age_hours)
        fx, st_f = sync_daily_series(
            "usdthb_daily",
            [("yahoo:THB=X", lambda: S.fetch_yahoo_daily("THB=X")),
             ("fred:DEXTHUS", lambda: S.fetch_fred_csv("DEXTHUS"))],
            C.USDTHB_DAILY_CSV, status, force, max_age_hours)
        cpi_m, st_c = sync_cpi(seed_cpi, status, force, max_age_hours)

    new_status = {
        "synced_at": _now_iso(),
        "seed_brent": {"first": str(seed_brent.index[0]), "last": str(seed_brent.index[-1]), "repairs": brent_repairs},
        "seed_cpi": {"first": str(seed_cpi.index[0]), "last": str(seed_cpi.index[-1])},
        st_b.name: asdict(st_b), st_f.name: asdict(st_f), st_c.name: asdict(st_c),
    }
    _save_status(new_status)
    return new_status


# --------------------------------------------------------------------------
# Dataset assembly
# --------------------------------------------------------------------------
@dataclass
class Dataset:
    quarterly: pd.DataFrame        # complete quarters: brent, usdthb, brent_thb, cpi, yoy, shocks
    brent_daily: pd.Series | None
    usdthb_daily: pd.Series | None
    cpi_monthly: pd.Series         # curated+extended monthly where available (may be empty)
    cpi_quarterly: pd.Series
    current_quarter: dict          # partial-quarter info for projections
    status: dict


def _quarter_mean_complete(s: pd.Series, last_complete: pd.Period) -> pd.Series:
    q = s.groupby(s.index.to_period("Q")).mean()
    return q[q.index <= last_complete]


def build_dataset(status: dict | None = None) -> Dataset:
    status = status or _load_status()
    seed_brent = read_seed_quarterly(C.SEED_BRENT_XLSX, "Brent_Oil_USD_per_Barrel")
    seed_cpi = read_seed_quarterly(C.SEED_CPI_XLSX, "CPI_Index")
    brent_d = _read_daily(C.BRENT_DAILY_CSV)
    fx_d = _read_daily(C.USDTHB_DAILY_CSV)
    cpi_m = _read_monthly(C.CPI_MONTHLY_CSV)

    today = pd.Timestamp.today().normalize()
    this_q = today.to_period("Q")
    last_complete_q = this_q - 1

    # Brent quarterly: daily averages where available, seed otherwise.
    if brent_d is not None:
        brent_q = _quarter_mean_complete(brent_d, last_complete_q)
        brent_q = seed_brent.combine_first(brent_q)  # seed wins on overlap (hand-checked)
        brent_q = brent_q.combine_first(seed_brent)
    else:
        brent_q = seed_brent.copy()
    fx_q = _quarter_mean_complete(fx_d, last_complete_q) if fx_d is not None else pd.Series(dtype=float)

    # CPI quarterly: curated seed, extended by validated monthly data (complete quarters only).
    cpi_q = seed_cpi.copy()
    if cpi_m is not None and not cpi_m.empty:
        counts = cpi_m.groupby(cpi_m.index.asfreq("Q")).size()
        ext = cpi_m.groupby(cpi_m.index.asfreq("Q")).mean()
        ext = ext[(counts == 3) & (ext.index > seed_cpi.index[-1])]
        cpi_q = pd.concat([cpi_q, ext]).sort_index()

    df = pd.DataFrame({"brent": brent_q, "cpi": cpi_q}).sort_index()
    df["usdthb"] = fx_q.reindex(df.index)
    df["brent_thb"] = df["brent"] * df["usdthb"]
    df["yoy"] = df["cpi"].pct_change(4) * 100
    df["oil_shock_pct"] = 100 * np.log(df["brent"]).diff()
    df["oil_shock_thb_pct"] = 100 * np.log(df["brent_thb"]).diff()
    df.index.name = "quarter"

    # Current (partial) quarter diagnostics from daily data.
    cur: dict = {"quarter": str(this_q)}
    if brent_d is not None:
        in_q = brent_d[brent_d.index.to_period("Q") == this_q]
        prev_q_avg = float(brent_q.get(last_complete_q, np.nan))
        cur.update({
            "days_so_far": int(len(in_q)),
            "brent_qtd_avg": float(in_q.mean()) if len(in_q) else None,
            "brent_latest": float(brent_d.iloc[-1]),
            "brent_latest_date": str(brent_d.index[-1].date()),
            "prev_quarter": str(last_complete_q),
            "prev_quarter_avg": prev_q_avg,
        })
        if len(in_q) and prev_q_avg and not np.isnan(prev_q_avg):
            cur["shock_qtd_pct"] = float(100 * np.log(in_q.mean() / prev_q_avg))
            cur["shock_spot_persists_pct"] = float(100 * np.log(brent_d.iloc[-1] / prev_q_avg))
    if fx_d is not None:
        cur["usdthb_latest"] = float(fx_d.iloc[-1])
        cur["usdthb_latest_date"] = str(fx_d.index[-1].date())

    return Dataset(quarterly=df, brent_daily=brent_d, usdthb_daily=fx_d,
                   cpi_monthly=cpi_m if cpi_m is not None else pd.Series(dtype=float),
                   cpi_quarterly=cpi_q, current_quarter=cur, status=status)
