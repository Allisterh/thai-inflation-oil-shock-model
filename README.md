# Thailand Oil Price Shock → Inflation Pass-Through Model

Estimating how oil price shocks transmit to Thai headline CPI inflation using Local Projections, kept in sync with daily oil prices, and served as a bilingual (Thai/English) web app that tells households what today's oil price means for their cost of living.

## What is in this repository

| Piece | What it does |
|---|---|
| `thai_oil_cpi/sync.py` | Fetches daily Brent, daily USD/THB and monthly Thai CPI, caches them in `data/cache/`, validates external CPI feeds against the curated series, and builds the quarterly model dataset. |
| `thai_oil_cpi/lp.py` | Jordà (2005) local projections with Newey–West standard errors. Reproduces the notebook's specification exactly (tested). |
| `thai_oil_cpi/projection.py` | Turns the impulse responses into things people can use: the inflation path implied by oil moves that have already happened, custom scenarios, extra baht per month for a household budget, and a pump-price estimate. |
| `thai_oil_cpi/pipeline.py` | Sync → estimate → write `results/*.csv` and `web/data/latest.json`. |
| `thai_oil_cpi/app.py` | FastAPI server: serves the web app plus `/api/latest`, `/api/project`, `/api/status`, `/api/refresh`. Re-syncs in the background every 12 hours. |
| `web/` | The web app. Static HTML/CSS/JS, no build step, works from the FastAPI server or from GitHub Pages. |
| `.github/workflows/daily-sync.yml` | Weekday job that re-syncs the data, re-estimates the model, commits the results and deploys `web/` to GitHub Pages. |
| `notebooks/analysis.ipynb` | The original exploratory analysis. |

## Quick start

```bash
git clone https://github.com/thaileetrakul27/thai-inflation-oil-shock-model.git
cd thai-inflation-oil-shock-model
pip install -r requirements.txt

python -m thai_oil_cpi run        # sync data, re-estimate, write results/ and web/data/latest.json
python -m thai_oil_cpi serve      # open http://127.0.0.1:8000
python -m pytest                  # tests
```

`python -m thai_oil_cpi run --no-sync` re-estimates from the cache without touching the network, and `--offline` never fetches at all. The web app only needs `web/` and `web/data/latest.json`, so any static host works.

## How the sync works

Each series has a chain of sources. The first that answers is used, the result is cached, and the cache is served if every source fails. `data/cache/sync_status.json` records which source was used, when, and why others were skipped.

| Series | Sources, in order | Notes |
|---|---|---|
| Brent, daily | Yahoo Finance `BZ=F` (ICE front-month futures) → EIA Brent spot spreadsheet → FRED `DCOILBRENTEU` | The futures series matches the curated quarterly file to within a few cents on average, which is why it is first. |
| USD/THB, daily | Yahoo Finance `THB=X` → FRED `DEXTHUS` | Used for the baht-denominated shock variant and the pump-price helper. |
| Thai CPI, monthly | `data/thai_cpi_monthly_manual.csv` → `THAI_CPI_URL` env var (any `date,value` CSV) → FRED → DBnomics (IMF) | Every external feed is checked against the curated quarterly series over the last four overlapping quarters and rejected if they disagree by more than 0.25%. The IMF feed on DBnomics mixes base-year vintages for 2022–2024 and is currently rejected for that reason. |

The curated quarterly spreadsheets in `data/` remain the base of the CPI series; external feeds only extend it forward with complete quarters. The Thai CPI is published monthly by the Ministry of Commerce (TPSO), whose site is not reachable from every network, so the simplest reliable way to keep the model current is to append the monthly index to `data/thai_cpi_monthly_manual.csv` (columns `date,value`, e.g. `2025-10,100.42`) when the release comes out. The daily sync picks it up automatically.

## Key findings (re-estimated automatically)

Quarterly sample 2018-Q1 to 2025-Q3, 31 observations. The table is regenerated on every run from `results/irf_oil_to_cpi_quarterly.csv`.

| Horizon | Impact (pp per 1% oil shock) | 95% CI | Significant? |
|---------|------------------------------|--------|--------------|
| Q1 | +0.071 | [+0.042, +0.099] | ✓ |
| Q2 | +0.051 | [+0.025, +0.076] | ✓ |
| Q3 | +0.080 | [+0.048, +0.113] | ✓ |
| Q4 | +0.017 | [−0.012, +0.047] | — |
| Q5 | +0.035 | [+0.011, +0.058] | ✓ |
| Q6 | +0.042 | [+0.021, +0.062] | ✓ |
| Q7 | −0.006 | [−0.018, +0.005] | — |
| Q8 | −0.019 | [−0.035, −0.002] | ✓ |

![Impulse Response Function](results/irf_plot.webp)

**Interpretation:** A 10% oil price increase raises Thai inflation by approximately 0.7–0.8 percentage points in the first 3 quarters. The effect then fades and slightly reverses by Q8, consistent with partial and transitory pass-through found in the literature.

A second variant, `results/irf_oil_thb_to_cpi_quarterly.csv`, uses Brent converted to baht as the shock; the app exposes it under "More options".

## Scenario analysis

For a **20% oil price shock** (e.g., geopolitical crisis):

| Quarter | CPI Impact (pp) | 95% CI |
|---------|-----------------|--------|
| Q1 | +1.41 | [+0.85, +1.98] |
| Q2 | +1.01 | [+0.50, +1.53] |
| Q3 | +1.61 | [+0.95, +2.26] |
| Q4 | +0.35 | [−0.25, +0.95] |

## What the web app shows

1. **Today's board**: latest Brent close, crude cost in baht per litre, USD/THB, and the quarter-to-date oil shock versus last quarter's average.
2. **For your household**: enter monthly spending and choose the shock basis (quarter-to-date average, today's price held all quarter, or a custom slider). The page shows the peak extra baht per month, the 12-month total with a plausible range, the inflation effect, and the full 8-quarter path with confidence band. The "observed" bases add up the effects of the last eight quarters of oil moves plus the current quarter, so a shock that happened two quarters ago still contributes where the model says it should.
3. **At the pump**: enter today's pump price and a pass-through share (gasohol full, diesel half while the Oil Fund cushions it) to see the implied change per litre.
4. **Brent crude price**: 1-week to 1-year changes and the daily series.
5. **What the model says**: the impulse response, the estimation data, method notes, limitations, and the live source status.

## Methodology

- **Model:** Local Projections (Jordà, 2005)
- **Shock variable:** Quarterly log change in Brent crude price (× 100 = % change)
- **Outcome:** Thailand headline CPI YoY inflation
- **Specification:** CPI YoY at horizon *h* regressed on contemporaneous oil shock, 4 lags of CPI YoY, and 4 lags of oil shocks
- **Inference:** HAC (Newey–West) standard errors with maxlags = *h* + 1
- **Scenarios:** Linear scaling of β(*h*); observed-shock paths sum β over the shock history

> This is a reduced-form historical pass-through estimate, not a structural forecast. See `docs/methodology.md`.

## Repository structure

```
thai-inflation-oil-shock-model/
├── thai_oil_cpi/              # package: sources, sync, lp, projection, pipeline, app, CLI
├── web/                       # web app (index.html, app.js, style.css, data/latest.json)
├── data/
│   ├── brent_quarterly.xlsx   # curated quarterly Brent (2016-Q1 to 2025-Q3)
│   ├── thai_cpi_quarterly.xlsx# curated quarterly Thai CPI (2017-Q1 to 2025-Q3)
│   ├── thai_cpi_monthly_manual.csv   # optional: monthly CPI you maintain (date,value)
│   └── cache/                 # synced daily/monthly series and sync_status.json
├── results/                   # IRF, scenario table, model dataset, plot
├── tests/                     # estimator reproduction, sync validation, projections
├── notebooks/analysis.ipynb
├── docs/methodology.md
└── .github/workflows/daily-sync.yml
```

## Data notes

- The curated Brent file had its 2024-Q4 row labelled "2025-Q4"; the label was corrected, which adds that quarter to the estimation sample. `tests/fixtures/irf_published_original.csv` keeps the IRF as originally published so the estimator can be checked against it.
- Brent in the curated file corresponds to ICE front-month futures averages (Yahoo `BZ=F`), not EIA's spot series, which differs by a few dollars in some quarters.

## Data sources

- **Brent Crude Oil Prices:** ICE Brent futures via Yahoo Finance; EIA; FRED
- **Thailand CPI Index:** Bank of Thailand / Ministry of Commerce (TPSO), curated quarterly
- **USD/THB:** Yahoo Finance; FRED

## License

MIT

## Author

Thai Leetrakul

## References

- Jordà, Ò. (2005). Estimation and inference of impulse responses by local projections. *American Economic Review*, 95(1), 161–182.
- Newey, W. K., & West, K. D. (1987). A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix. *Econometrica*, 55(3), 703–708.
