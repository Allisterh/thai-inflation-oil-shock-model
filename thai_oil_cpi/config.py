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
LATEST_JSON = WEB_DATA_DIR / "latest.json"

# Legacy curated quarterly files (kept for the original notebook and as a cross-check).
SEED_BRENT_XLSX = DATA_DIR / "brent_quarterly.xlsx"
SEED_CPI_XLSX = DATA_DIR / "thai_cpi_quarterly.xlsx"

# Cache files written by the sync step.
TPSO_CPI_CSV = CACHE_DIR / "tpso_cpi_long.csv"
TPSO_MASTER_JSON = CACHE_DIR / "tpso_master.json"
PINK_SHEET_CSV = CACHE_DIR / "worldbank_crude_monthly.csv"
IMF_FX_CSV = CACHE_DIR / "imf_usdthb_monthly.csv"
BRENT_DAILY_CSV = CACHE_DIR / "brent_daily.csv"
USDTHB_DAILY_CSV = CACHE_DIR / "usdthb_daily.csv"
EPPO_RETAIL_HISTORY_CSV = CACHE_DIR / "eppo_retail_monthly.csv"
EPPO_RETAIL_DAILY_CSV = CACHE_DIR / "eppo_retail_daily.csv"
EPPO_STRUCTURE_JSON = CACHE_DIR / "eppo_price_structure.json"
EPPO_STRUCTURE_HISTORY_CSV = CACHE_DIR / "eppo_price_structure_history.csv"
SYNC_STATUS_JSON = CACHE_DIR / "sync_status.json"

# Monthly local-projection specification.
SAMPLE_START = os.environ.get("THAI_OIL_CPI_SAMPLE_START", "2000-01")
HORIZONS_M = list(range(1, 25))
LAGS_M = 12
# Legacy quarterly specification (notebooks/analysis.ipynb).
HORIZONS_Q = list(range(1, 9))
LAGS_Q = 4
HAC_EXTRA_LAGS = 1
CONF_Z = 1.96

# Outcomes (TPSO series names from sources.tpso.CODES) and shock variants.
OUTCOMES = ["headline", "energy", "vehicles_fuel", "electricity_fuel_water", "public_transport", "food", "core"]
SHOCKS = {"dubai_thb": "shock_dubai_thb", "retail_fuel": "shock_retail_fuel", "dubai_usd": "shock_dubai_usd", "brent_usd": "shock_brent_usd"}
# Retail fuel index weights (share of road-fuel volume): diesel dominates in Thailand.
RETAIL_FUEL_WEIGHTS = {"diesel": 0.6, "gasoline": 0.4}
PRIMARY_SHOCK = "dubai_thb"          # used for what-if scenarios and the asymmetric diagnostic
COMBINED_SHOCKS = ("retail_fuel", "dubai_thb")  # averaged for the headline household estimate
DISPLAY_DEFAULT = "combined"
BACKTEST_ORIGINS = 36

# Sync behaviour.
DEFAULT_MAX_AGE_HOURS = float(os.environ.get("THAI_OIL_CPI_MAX_AGE_HOURS", "12"))
HTTP_TIMEOUT = 60
USER_AGENT = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 "
              "thai-oil-cpi-model/2.0 (+https://github.com/thaileetrakul27/thai-inflation-oil-shock-model)")

WEB_DAILY_DAYS = 500
LITRES_PER_BARREL = 158.987
VAT_RATE = 0.07
