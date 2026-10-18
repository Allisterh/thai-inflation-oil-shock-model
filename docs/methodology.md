# Methodology

## Overview

This project estimates the pass-through of oil price shocks to Thailand's headline CPI inflation using **Local Projections** (Jordà, 2005). This approach is widely used by central banks and policy institutions for its flexibility and robustness.

## Data

### Brent Crude Oil Prices
- **Frequency:** Quarterly averages
- **Source:** EIA / World Bank
- **Period:** 2016-Q1 to 2025-Q3
- **Units:** USD per barrel

### Thailand CPI Index
- **Frequency:** Quarterly
- **Source:** Bank of Thailand
- **Period:** 2017-Q1 to 2025-Q3
- **Base:** 2019 = 100

## Variable Definitions

### Oil Shock
The oil shock is defined as the quarterly log change in Brent crude prices, multiplied by 100 to express in percentage terms:

```
oil_shock_pct = 100 × [ln(Brent_t) - ln(Brent_{t-1})]
```

This transformation:
- Is approximately equal to percentage change for small changes
- Is symmetric (a 10% increase and 10% decrease have equal magnitude)
- Is standard in the macroeconomic literature

### CPI YoY Inflation
Year-over-year inflation is computed from the quarterly CPI index:

```
YoY_Inflation = [(CPI_t / CPI_{t-4}) - 1] × 100
```

## Model Specification

For each forecast horizon h = 1, 2, ..., 8 quarters, we estimate:

```
CPI_YoY_{t+h} = α_h + β_h × oil_shock_t 
                + Σ(k=1 to 4) γ_k × CPI_YoY_{t-k}
                + Σ(k=1 to 4) δ_k × oil_shock_{t-k}
                + ε_{t+h}
```

Where:
- **β_h** is the coefficient of interest: the response of CPI YoY inflation at horizon h to a 1 percentage point oil shock at time t
- **4 lags of CPI YoY** control for inflation persistence
- **4 lags of oil shock** control for delayed pass-through from previous shocks

## Inference

Standard errors are computed using **Heteroskedasticity and Autocorrelation Consistent (HAC)** estimation (Newey-West), with:

```
maxlags = h + 1
```

This accounts for:
- Heteroskedasticity in the error term
- Serial correlation induced by overlapping forecast horizons

95% confidence intervals are constructed as:

```
[β_h - 1.96 × SE(β_h), β_h + 1.96 × SE(β_h)]
```

## Interpretation

The coefficient **β_h** has the following interpretation:

> A 1% increase in Brent crude oil prices is associated with a β_h percentage point change in Thailand's YoY CPI inflation after h quarters.

For scenario analysis, we scale linearly:

```
Impact(h, shock%) = β_h × shock%
```

For example, if β_1 = 0.072, then a 10% oil price shock implies:
- Q1 impact: 0.072 × 10 = 0.72 percentage points

## Limitations

1. **Reduced-form estimate:** This is not a structural model. It captures historical correlations, not causal mechanisms.

2. **Linear assumption:** The model assumes symmetric and proportional effects. In reality, large shocks may have non-linear effects.

3. **Sample size:** With ~25-30 observations for estimation, confidence intervals are relatively wide.

4. **Omitted variables:** The model does not control for other factors affecting inflation (monetary policy, exchange rates, supply shocks).

5. **Time-varying pass-through:** Pass-through may have changed over time due to policy changes or structural shifts in the economy.

## References

- Jordà, Ò. (2005). Estimation and inference of impulse responses by local projections. *American Economic Review*, 95(1), 161–182.

- Newey, W. K., & West, K. D. (1987). A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix. *Econometrica*, 55(3), 703–708.

## Version 2: monthly model on official Thai data

The quarterly specification above is the original exploration and is preserved in the notebook. The live pipeline now estimates a monthly version on official sources.

### Data

| Series | Source | Notes |
|---|---|---|
| CPI, all categories, with weights | TPSO Index API (`index.tpso.go.th/api/cpig/filter`, documented at tpso.go.th/indexAPI_Manual) | base 2566 = 2023, chained back to 1976; sub-indices for energy, vehicles and fuel, electricity/fuel/water, public transport, food, raw food, core |
| Dubai, Brent, WTI monthly | World Bank Pink Sheet (`CMO-Historical-Data-Monthly.xlsx`, URL discovered from the commodity-markets page) | IMF PCPS via DBnomics as fallback |
| Brent spot daily | EIA `RBRTEd.xls` | ICE futures (Yahoo `BZ=F`) as fallback; spot is used because the Pink Sheet's Brent and Dubai are spot assessments |
| USD/THB monthly | IMF IFS `ENDA_XDC_USD_RATE` via DBnomics, extended with Yahoo daily averages | overlap agrees within 0.25% |
| Pump prices and price structure | EPPO `wp-json/oil-api/v1/oil-prices`, `oil-structure-prices` | daily snapshots accumulate in the cache |
| Retail history | EPPO Table 9 (`P09.xls`) | monthly weighted averages since 2003 |

### Shock and outcomes

```
shock_t = 100 × [ln(Dubai_t × FX_t) − ln(Dubai_{t−1} × FX_{t−1})]       (monthly averages)
y_t     = 100 × (CPI_t / CPI_{t−12} − 1)                                 for each index
```

### Specification

For each outcome and horizon h = 1 … 24 months:

```
y_{t+h} = α_h + β_h shock_t + Σ_{k=1}^{12} γ_k y_{t−k} + Σ_{k=1}^{12} δ_k shock_{t−k} + ε_{t+h}
```

with Newey–West standard errors, maxlags = h + 1, on the sample from January 2000 (configurable). With roughly 320 observations the bands are far tighter than in the 31-quarter version.

### Nowcasting the current month

Dubai for months after the last Pink Sheet release is estimated as the monthly average of daily Brent spot times the Dubai/Brent ratio of the latest published month, converted at the monthly average of daily USD/THB. Two conventions are shown: the month-to-date average, and today's price held for the rest of the month.

### From impulse responses to household baht

The oil-driven contribution to each index j months ahead sums the last 24 monthly shocks (including the nowcast) along the impulse response: Δy_{t+j} = Σ_k β_{j+k} shock_{t−k}. The household's extra spending per month in category c is spend × share_c × Δy_{c,t+j} / 100, with shares defaulting to the CPI weights (vehicles and fuel 15.9%, electricity/fuel/water 5.2%, public transport 1.6%, food 39.5%, everything else via core inflation). The 12-month total sums the first twelve months.

### Pump prices

EPPO's price build-up gives, per product, the ex-refinery price, excise, municipal tax, Oil Fund and conservation fund levies, marketing margin and VAT. The levies and margin are fixed baht per litre, so the pump price moves with the ex-refinery price times 1.07 (VAT). The app applies the selected crude move per litre, times a user-chosen pass-through share representing Oil Fund cushioning.
