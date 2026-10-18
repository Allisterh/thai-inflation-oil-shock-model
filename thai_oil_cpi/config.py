"""Paths and tunable constants shared across the package."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(os.environ.get("THAI_OIL_CPI_ROOT", Path(__file__).resolve().parent.parent))
DATA_DIR = ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"
RESULTS_DIR = ROOT / "results"
WEB_DIR = ROOT / "web"
WEB_DATA_DIR = WEB_DIR / "data"

# Curated seed series shipped with the repository (quarterly, hand-checked).
SEED_BRENT_XLSX = DATA_DIR / "brent_quarterly.xlsx"
SEED_CPI_XLSX = DATA_DIR / "thai_cpi_quarterly.xlsx"
# Optional manual monthly CPI file the maintainer can keep current from the
# Ministry of Commerce (TPSO) monthly release. Columns: date (YYYY-MM), value.
MANUAL_CPI_CSV = DATA_DIR / "thai_cpi_monthly_manual.csv"

# Cache files written by the sync step.
BRENT_DAILY_CSV = CACHE_DIR / "brent_daily.csv"
USDTHB_DAILY_CSV = CACHE_DIR / "usdthb_daily.csv"
CPI_MONTHLY_CSV = CACHE_DIR / "thai_cpi_monthly.csv"
SYNC_STATUS_JSON = CACHE_DIR / "sync_status.json"

LATEST_JSON = WEB_DATA_DIR / "latest.json"

# Local-projection specification (matches notebooks/analysis.ipynb).
HORIZONS = list(range(1, 9))
LAGS_Y = 4
LAGS_X = 4
HAC_EXTRA_LAGS = 1  # maxlags = h + HAC_EXTRA_LAGS
CONF_Z = 1.96

# Sync behaviour.
DEFAULT_MAX_AGE_HOURS = float(os.environ.get("THAI_OIL_CPI_MAX_AGE_HOURS", "12"))
HTTP_TIMEOUT = 60
USER_AGENT = "thai-oil-cpi-model/1.0 (+https://github.com/thaileetrakul27/thai-inflation-oil-shock-model)"

# Validation tolerance for external CPI feeds: the last N overlapping quarters
# must agree with the curated series within TOL percent, otherwise the feed is
# rejected (guards against base-year vintage mixing in aggregator feeds).
CPI_VALIDATION_QUARTERS = 4
CPI_VALIDATION_TOL_PCT = 0.25

# Daily history kept in the web payload.
WEB_DAILY_DAYS = 500

# Physical / financial constants for the pump-price helper.
LITRES_PER_BARREL = 158.987
