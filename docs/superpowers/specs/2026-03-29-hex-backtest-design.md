# Hex Backtest & Hedge Effectiveness — Design Spec

## Summary

Integrate Hex API to provide hedge effectiveness scoring and historical backtesting for the user's portfolio. User clicks a "Run Backtest" button on the dashboard, which triggers a Hex notebook that pulls real historical data and returns analysis results displayed in a new dashboard section.

## Architecture

### Hex Notebook
- Receives portfolio holdings and selected Polymarket markets as `inputParams`
- Pulls real historical stock prices via Yahoo Finance (available in Hex)
- Calculates hedge effectiveness by correlating stock price movements with Polymarket market probabilities
- Simulates a 6-month backtest comparing portfolio performance with vs without hedges
- Outputs results as JSON

### Backend
- New endpoint: `POST /hex/run`
- Receives holdings + markets from frontend
- Calls Hex API `POST https://app.hex.tech/api/v1/projects/{PROJECT_ID}/runs` with `inputParams`
- Polls `GET .../runs/{runId}` until status is `COMPLETED`
- Returns Hex output JSON to frontend
- New file: `service-data/hex.js` — Hex API client
- New file: `service-data/routes/hex.js` — route handler

### Frontend
- New section on Dashboard: "Hedge Effectiveness & Backtest" below Portfolio Analysis
- "Run Backtest" button triggers `POST /hex/run`
- Loading state while Hex notebook runs (can take 10-30 seconds)
- Displays results when complete

## Environment Variables

```
HEX_API_TOKEN=hxtw_eb76cd1078d6dcfd46b0960fd6f0c38bbbffc3e9faae6a96f5f4fa0be945a6e368c27a8bf25cd138ad2cfd8e86974a41
HEX_PROJECT_ID=<to be provided after notebook is created>
```

## Data Flow

1. User clicks "Run Backtest" on dashboard
2. Frontend calls `POST /hex/run` with `{ holdings, markets }`
3. Backend calls Hex API `RunProject` with `inputParams` containing holdings and markets as JSON strings
4. Backend polls Hex API `GetRunStatus` every 2 seconds until status is `COMPLETED` or `ERRORED`
5. Backend returns the notebook's output JSON to frontend
6. Frontend renders the backtest section

## Hex Notebook Input Params

```json
{
  "holdings_json": "[{\"ticker\":\"TSLA\",\"weight\":60},{\"ticker\":\"META\",\"weight\":40}]",
  "markets_json": "[{\"title\":\"Will Trump...\",\"probability\":0.65}]"
}
```

Passed as strings because Hex input params only support string/number/boolean.

## Hex Notebook Output (JSON)

The notebook's final cell outputs a JSON object:

```json
{
  "hedgeEffectiveness": [
    {
      "ticker": "TSLA",
      "marketTitle": "Will Trump impose new tariffs?",
      "correlation": -0.72,
      "score": "Strong",
      "explanation": "TSLA drops when tariff probability rises"
    }
  ],
  "backtest": {
    "dates": ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"],
    "portfolioOnly": [100, 95, 88, 82, 90, 85],
    "portfolioWithHedge": [100, 97, 94, 90, 95, 93]
  },
  "summary": {
    "maxDrawdownReduction": "12%",
    "riskAdjustedImprovement": "8%",
    "bestHedge": "Will Trump impose new tariffs?",
    "worstHedge": "Will Bitcoin reach $100k?"
  }
}
```

## Frontend Display

### "Run Backtest" button
- Appears in the dashboard, below the Portfolio Analysis section
- Disabled while running, shows spinner + "Running backtest..."

### Results section (after completion)
- **Hedge Effectiveness table**: Ticker | Market | Correlation | Score | Explanation
- **Backtest line chart**: Two lines — "Portfolio Only" vs "Portfolio + Hedges" over 6 months
- **Summary stats**: Max drawdown reduction, risk-adjusted improvement, best/worst hedge

## Hex Notebook Code

The notebook will be written in Python and needs to:
1. Parse `holdings_json` and `markets_json` input params
2. Use `yfinance` to pull 6 months of daily stock prices for each holding
3. Calculate portfolio value over time (weighted by holding weights)
4. For each market, simulate a hedge position based on the market probability
5. Calculate correlation between stock returns and market probability changes
6. Score hedge effectiveness (Strong/Moderate/Weak based on correlation)
7. Compute backtest metrics (max drawdown with/without hedges)
8. Output the JSON result

## Scope Exclusions

- No real Polymarket historical probability data (simulated based on current probability)
- No real trading simulation (simplified model)
- No persistent storage of backtest results
- No configuration of backtest parameters (fixed 6-month window)
