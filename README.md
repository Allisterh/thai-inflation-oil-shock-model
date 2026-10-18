# Thailand oil shock → inflation and cost of living

A monthly local-projections model of how crude oil prices pass through to Thai consumer prices, estimated on official Thai data, re-synced every day, and served as a bilingual (Thai/English) web app that tells households what today's oil price means for their monthly budget.

Live numbers come from Thai official sources wherever they exist:

| Series | Source | Frequency | Coverage |
|---|---|---|---|
| Consumer price index, headline and every category, with basket weights | Trade Policy and Strategy Office (TPSO), Ministry of Commerce, Index API | monthly | Jan 1976 → latest release |
| Dubai, Brent and WTI crude | World Bank Commodity Price Data (Pink Sheet), IMF PCPS as fallback | monthly | 1960 → previous month |
| Brent spot (dated Brent) | US EIA, ICE futures via Yahoo Finance as fallback | daily | 1987 → two days ago |
| USD/THB | IMF IFS (monthly history); ECB reference rates via the open Frankfurter API (daily), Yahoo Finance only as a fallback | monthly and daily | 1957 → yesterday |
| Pump prices by brand and the official price build-up (ex-refinery, excise, Oil Fund, margin, VAT) | Energy Policy and Planning Office (EPPO), Ministry of Energy, JSON | daily | snapshots accumulate from first run |
| Bangkok retail prices by product | EPPO petroleum price statistics, Table 9 | monthly | 2003 → previous month |

## Why Dubai, in baht

Thai refineries import mostly Middle East crude priced off the Dubai benchmark, and households pay in baht. The primary shock is therefore the monthly log change in Dubai crude converted at the monthly USD/THB rate. Dubai in dollars and Brent in dollars are estimated as alternatives and can be selected in the app. The spread between Brent and Dubai is not constant: in September 2026 Brent averaged 116.8 dollars while Dubai averaged 93.3, so the choice of benchmark changes the size of the shock materially.

## Two models, combined

Government price management is the largest source of error in a crude-only model: Thailand's Oil Fund caps and subsidies mean pump prices do not follow crude one for one. The pipeline therefore estimates the same local projections twice:

1. **Pump-price model**: the shock is the monthly log change in a Bangkok retail fuel index (60% diesel B7, 40% gasohol 95, from EPPO, since 2003). It already embeds every policy decision and uses today's actual pump prices for the current month.
2. **Crude model**: the shock is the monthly log change in Dubai crude in baht. It captures crude moves that have not reached the pump yet and is used for what-if scenarios.

The headline household number is the average of the two, and the band shown covers the confidence intervals of both. Each model is also shown on its own.

## How accurate it has been

`thai_oil_cpi/backtest.py` re-estimates each model every month over the last three years using only data available at the time, projects the change in headline inflation over the following months from the shocks that occurred, and compares with the outcome. Root-mean-square error in percentage points, against a benchmark of guessing "no change" (regenerated on every run; see `results/backtest_rolling.csv`):

| Horizon | Pump-price model | Crude model | Combined | No change |
|---|---|---|---|---|
| 1 month | 0.59 | 0.71 | 0.62 | 0.65 |
| 3 months | 0.89 | 1.21 | 0.95 | 1.34 |
| 6 months | 0.96 | 1.57 | 1.14 | 2.08 |
| 12 months | 1.47 | 2.12 | 1.61 | 2.87 |

The pump-price model's six-month projections correlate 0.88 with outcomes. Both models have a small positive bias, meaning they slightly overstate inflation after oil shocks, consistent with policy cushioning that the crude model cannot see. The detailed page shows this table and a chart of six-month projections against outcomes.

Splitting crude rises from falls (`results/irf_monthly_dubai_thb_asymmetric.csv`) gives responses that differ by less than their standard errors, so a single symmetric response is used.

## What the model finds

Monthly local projections (Jordà 2005) on January 2000 to the latest CPI month, 12 lags of the outcome and of the shock, horizons 1 to 24 months, Newey–West standard errors. Response of each index's year-on-year rate to a 10% rise in Dubai crude in baht, percentage points (re-estimated on every run; see `results/irf_monthly_dubai_thb.csv`):

| Index | 1 month | 3 months | 6 months | 12 months | 24 months |
|---|---|---|---|---|---|
| Headline CPI | +0.51 | +0.60 | +0.58 | +0.45 | +0.07 |
| Energy | +4.4 | +4.2 | +3.5 | +1.3 | 0.0 |
| Vehicles and fuel | +3.1 | +3.2 | +2.7 | +0.9 | −0.2 |
| Food and drink | +0.04 | +0.26 | +0.45 | +0.68 | +0.05 |
| Core | +0.05 | +0.11 | +0.16 | +0.19 | +0.02 |

Energy and fuel prices react within a month and fade within a year. Food and core prices move later and more gently but persist, which is where most of the second-year cost lives.

## The web app

1. **Today's board**: latest monthly Dubai price, latest Brent spot, the baht, Gasohol 95 and diesel at the pump, and this month's crude move in baht versus last month (Dubai for the current month is nowcast from daily Brent times the latest Dubai/Brent ratio).
2. **Thai inflation, latest**: headline, energy, food and core, year on year, from the newest TPSO release.
3. **For your household**: monthly spending, a choice of oil price basis (what has already happened month to date, today's price held for the month, or a custom one-off move), and the household's spending shares for vehicle fuel, electricity and cooking gas, public transport and food, defaulting to the CPI basket weights. Outputs are the peak extra baht per month, the 12-month total, a category breakdown and the full 24-month inflation path with confidence band for any index.
4. **At the pump**: the official price build-up for the chosen fuel from EPPO and the implied change per litre for the selected crude move, with a choice of how much the Oil Fund cushions.
5. **Crude oil prices**: daily Brent, monthly Dubai versus Brent, and Bangkok retail prices since 2015.
6. **What the model says**: impulse responses per index, the estimation data, method notes and the live source status.

## Quick start

```bash
git clone https://github.com/thaileetrakul27/thai-inflation-oil-shock-model.git
cd thai-inflation-oil-shock-model
pip install -r requirements.txt

python -m thai_oil_cpi run        # sync all sources, re-estimate, write results/ and web/data/latest.json
python -m thai_oil_cpi serve      # open http://127.0.0.1:8000
python -m pytest                  # tests
```

`python -m thai_oil_cpi run --no-sync` re-estimates from the cache, `--offline` never touches the network, and `THAI_OIL_CPI_SAMPLE_START=2005-01` changes the estimation window. The web app is static: `web/` plus `web/data/latest.json` can be hosted anywhere, and `.github/workflows/daily-sync.yml` refreshes the data each weekday morning and deploys to GitHub Pages.

## Repository layout

```
thai_oil_cpi/
├── sources/          # tpso.py, worldbank.py, eia.py, yahoo.py, dbnomics.py, eppo.py, http.py
├── sync.py           # source chains, cache, status, monthly dataset and nowcast
├── lp.py             # Jordà local projections with HAC standard errors
├── model.py          # monthly estimation for every (shock, outcome) pair
├── projection.py     # observed-shock paths, scenarios, household breakdown, pump prices
├── pipeline.py       # run everything, write results/ and web/data/latest.json
├── app.py            # FastAPI: web app + /api/latest, /api/project, /api/status, /api/refresh
└── __main__.py       # python -m thai_oil_cpi {sync,run,serve}
web/                  # index.html, app.js, style.css, data/latest.json
data/cache/           # synced series and sync_status.json (committed so the static site has data)
data/*.xlsx           # the original hand-curated quarterly files (kept for the notebook and a cross-check test)
results/              # irf_monthly_*.csv, model_dataset_monthly.csv, cpi_weights_tpso.csv, legacy quarterly outputs
notebooks/analysis.ipynb   # the original quarterly exploration
docs/methodology.md
tests/
```

## Sync behaviour

Every series has an ordered chain of sources; the first that answers is cached and the cache is served when all fail. `data/cache/sync_status.json` records which source was used, when, the latest observation and any errors. TPSO is only re-downloaded when its `lastUpdated` stamp changes. External CPI data is cross-checked against the original curated spreadsheet in `tests/test_crosscheck.py` (they agree to two decimals).

## Is local projections the right method?

Local projections (Jordà 2005) and structural VARs are the two standard tools for estimating how oil prices pass through to consumer prices; central banks and the IMF use both, and the two give similar impulse responses when the specifications match. Local projections are preferred here because they impose less structure on the dynamics, handle a 24-month horizon without inverting a VAR, and make the Newey–West inference straightforward. What they do not solve is identification: an oil price move can reflect global demand as well as supply. For a small open economy like Thailand the world oil price is close to exogenous, which is the assumption made here. The remaining limitations of the approach are the ones listed below.

## Caveats

- Reduced-form historical pass-through, not a forecast. No current policy (diesel caps financed by the Oil Fund, electricity tariff measures, interest rates) is modelled.
- Linear and symmetric by construction. Confidence bands on paths that combine many shocks ignore the covariance between horizons.
- The current month's Dubai price is a nowcast from daily Brent spot and last month's Dubai/Brent ratio. When that spread moves fast, the nowcast is off.
- Household figures scale the category indices by the household's own spending shares; everything outside the four named categories is proxied by core inflation.

## License

MIT

## Author

Thai Leetrakul

## References

- Jordà, Ò. (2005). Estimation and inference of impulse responses by local projections. *American Economic Review*, 95(1), 161–182.
- Newey, W. K., & West, K. D. (1987). A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix. *Econometrica*, 55(3), 703–708.
