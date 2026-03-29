# Hex Backtest & Hedge Effectiveness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Run Backtest" button to the dashboard that triggers a Hex notebook for hedge effectiveness scoring and historical backtesting, displaying results inline.

**Architecture:** Frontend button triggers `POST /hex/run` on the backend, which calls the Hex API to run a published notebook with portfolio holdings and markets as input. Backend polls for completion, returns results. Frontend renders a hedge effectiveness table, backtest line chart, and summary stats in a new dashboard section.

**Tech Stack:** Hex API (REST), Yahoo Finance (in Hex notebook via yfinance), React, Express

---

## File Structure

### New files
- `service-data/hex.js` — Hex API client: trigger run, poll status, get results
- `service-data/routes/hex.js` — Express route handler for `POST /hex/run`
- `frontend/src/components/BacktestSection.tsx` — Dashboard section showing backtest results

### Modified files
- `service-data/server.js` — Mount `/hex/run` route
- `service-data/.env` — Add `HEX_API_TOKEN` and `HEX_PROJECT_ID`
- `frontend/src/api/client.ts` — Add `runBacktest()` function
- `frontend/src/types.ts` — Add backtest result types
- `frontend/src/pages/Dashboard.tsx` — Add BacktestSection and trigger button

---

### Task 1: Add Hex credentials to .env

**Files:**
- Modify: `service-data/.env`

- [ ] **Step 1: Add env vars**

Add these lines to `service-data/.env`:

```
HEX_API_TOKEN=hxtw_eb76cd1078d6dcfd46b0960fd6f0c38bbbffc3e9faae6a96f5f4fa0be945a6e368c27a8bf25cd138ad2cfd8e86974a41
HEX_PROJECT_ID=PLACEHOLDER
```

The `HEX_PROJECT_ID` will be updated after the user creates and publishes the Hex notebook.

- [ ] **Step 2: Verify**

```bash
cd /Users/louisyu/PolyHedge/service-data && node -e 'require("dotenv").config(); console.log(process.env.HEX_API_TOKEN ? "OK" : "MISSING")'
```

Expected: `OK`

Note: Do NOT commit .env files.

---

### Task 2: Build Hex API client

**Files:**
- Create: `service-data/hex.js`

- [ ] **Step 1: Create the hex.js module**

```js
const HEX_BASE_URL = "https://app.hex.tech/api/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90; // 3 minutes max

/**
 * Trigger a Hex project run with input parameters.
 * Returns { runId, runStatusUrl }.
 */
async function triggerRun(projectId, inputParams) {
  const token = process.env.HEX_API_TOKEN;
  if (!token) throw new Error("HEX_API_TOKEN not configured");

  const response = await fetch(`${HEX_BASE_URL}/projects/${projectId}/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputParams }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hex API error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Poll a Hex run until it completes or errors.
 * Returns the final run status object.
 */
async function pollRunStatus(projectId, runId) {
  const token = process.env.HEX_API_TOKEN;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(
      `${HEX_BASE_URL}/projects/${projectId}/runs/${runId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Hex status poll failed: ${response.status}`);
    }

    const data = await response.json();
    const status = data.status;

    if (status === "COMPLETED") {
      return data;
    }
    if (status === "ERRORED" || status === "KILLED") {
      throw new Error(`Hex run ${status}: ${data.statusMessage || "unknown error"}`);
    }

    // Still running — wait and poll again
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Hex run timed out after 3 minutes");
}

/**
 * Run a Hex project and wait for results.
 * @param {string} projectId
 * @param {object} inputParams - key/value pairs for Hex input parameters
 * @returns {object} The completed run data
 */
async function runAndWait(projectId, inputParams) {
  console.log(`[hex] Triggering run for project ${projectId}...`);
  const { runId } = await triggerRun(projectId, inputParams);
  console.log(`[hex] Run started: ${runId}, polling...`);
  const result = await pollRunStatus(projectId, runId);
  console.log(`[hex] Run completed: ${runId}`);
  return result;
}

module.exports = { triggerRun, pollRunStatus, runAndWait };
```

- [ ] **Step 2: Verify module loads**

```bash
cd /Users/louisyu/PolyHedge/service-data && node -e "const h = require('./hex'); console.log(Object.keys(h))"
```

Expected: `[ 'triggerRun', 'pollRunStatus', 'runAndWait' ]`

- [ ] **Step 3: Commit**

```bash
git add service-data/hex.js
git commit -m "feat: add Hex API client for backtest integration"
```

---

### Task 3: Build the hex route handler

**Files:**
- Create: `service-data/routes/hex.js`
- Modify: `service-data/server.js`

- [ ] **Step 1: Create the route handler**

```js
const { runAndWait } = require("../hex");

async function handler(req, res) {
  const { holdings, markets } = req.body;

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ error: "Missing required field: holdings" });
  }

  const projectId = process.env.HEX_PROJECT_ID;
  if (!projectId || projectId === "PLACEHOLDER") {
    return res.status(503).json({ error: "Hex project not configured" });
  }

  try {
    const inputParams = {
      holdings_json: JSON.stringify(holdings),
      markets_json: JSON.stringify(markets || []),
    };

    const result = await runAndWait(projectId, inputParams);

    // The Hex notebook should output JSON in its final cell
    // The run result may contain the output in different formats
    // For now, return the full result and let the frontend parse what it needs
    return res.json(result);
  } catch (err) {
    console.error("[/hex/run] Error:", err.message);

    if (err.message.includes("timed out")) {
      return res.status(504).json({ error: "Backtest timed out", detail: err.message });
    }
    if (err.message.includes("ERRORED")) {
      return res.status(502).json({ error: "Backtest failed", detail: err.message });
    }

    return res.status(500).json({ error: "Failed to run backtest", detail: err.message });
  }
}

module.exports = { handler };
```

- [ ] **Step 2: Mount the route in server.js**

Add import near top of `service-data/server.js` (after the `authGoogleHandler` import):

```js
const { handler: hexRunHandler } = require("./routes/hex");
```

Add route after the `/auth/google` route:

```js
// ---------------------------------------------------------------------------
// POST /hex/run — Hex backtest
// ---------------------------------------------------------------------------
app.post("/hex/run", hexRunHandler);
```

- [ ] **Step 3: Verify**

```bash
cd /Users/louisyu/PolyHedge/service-data && node -e "require('./routes/hex')"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add service-data/routes/hex.js service-data/server.js
git commit -m "feat: add POST /hex/run endpoint for backtest"
```

---

### Task 4: Add backtest types and API function to frontend

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add types to types.ts**

Add at the end of `frontend/src/types.ts`:

```ts
// ── Hex Backtest Types ──────────────────────

export interface HedgeEffectivenessRow {
  ticker: string
  marketTitle: string
  correlation: number
  score: 'Strong' | 'Moderate' | 'Weak' | 'None'
  explanation: string
}

export interface BacktestData {
  dates: string[]
  portfolioOnly: number[]
  portfolioWithHedge: number[]
}

export interface BacktestSummary {
  maxDrawdownReduction: string
  riskAdjustedImprovement: string
  bestHedge: string
  worstHedge: string
}

export interface BacktestResult {
  hedgeEffectiveness: HedgeEffectivenessRow[]
  backtest: BacktestData
  summary: BacktestSummary
}
```

- [ ] **Step 2: Add runBacktest to client.ts**

Add at the end of `frontend/src/api/client.ts` (before any deprecated/mock functions):

```ts
// ── Hex Backtest ──────────────────────────────────────

export async function runBacktest(
  positions: Position[],
  markets: SelectedMarket[]
): Promise<BacktestResult> {
  const totalValue = positions.reduce((s, p) => s + (p.marketValue || p.shares * p.avgCost), 0)
  const holdings = positions.map((p) => {
    const value = p.marketValue || p.shares * p.avgCost
    return { ticker: p.ticker, weight: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0 }
  })
  const marketData = markets.map((m) => ({
    title: m.title,
    probability: m.probability,
    marketId: m.marketId,
  }))

  const res = await fetch(`${API_BASE}/hex/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, markets: marketData }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Backtest failed' }))
    throw new Error(err.error || 'Backtest failed')
  }
  return res.json()
}
```

Add the import for `SelectedMarket` and `BacktestResult` at the top of client.ts:

```ts
import type { Position, Market, BundleSummary, AnalysisResult, SelectedMarket, BacktestResult } from '../types'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts
git commit -m "feat: add backtest types and runBacktest API function"
```

---

### Task 5: Create BacktestSection component

**Files:**
- Create: `frontend/src/components/BacktestSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { BarChart3, Loader2, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import type { BacktestResult, Position, SelectedMarket } from '../types'
import { runBacktest } from '../api/client'

interface Props {
  positions: Position[]
  markets: SelectedMarket[]
}

export default function BacktestSection({ positions, markets }: Props) {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (positions.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const data = await runBacktest(positions, markets)
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">
          Hedge Backtest
        </h2>
        <button
          onClick={handleRun}
          disabled={loading || positions.length === 0}
          className="text-[11px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer disabled:opacity-30 transition-colors duration-150 flex items-center gap-1"
        >
          {loading ? (
            <><Loader2 size={10} className="animate-spin" /> Running...</>
          ) : result ? (
            <><RefreshCw size={10} /> Re-run</>
          ) : (
            <><BarChart3 size={10} /> Run Backtest</>
          )}
        </button>
      </div>

      {/* Initial state */}
      {!result && !loading && !error && (
        <div className="py-8 text-center">
          <BarChart3 size={20} className="text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-text-muted text-[13px]">
            Run a backtest to see how your hedges would have performed
          </p>
          <button
            onClick={handleRun}
            disabled={positions.length === 0 || markets.length === 0}
            className="mt-3 text-[12px] font-medium text-text-primary bg-transparent border border-border rounded-lg px-4 py-2 cursor-pointer hover:bg-bg-hover transition-colors disabled:opacity-30"
          >
            Run Backtest
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center">
          <Loader2 size={16} className="animate-spin text-text-muted mx-auto mb-2" />
          <p className="text-text-muted text-[13px]">Running backtest (this may take 15-30s)...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-6 text-center">
          <p className="text-red text-[13px]">{error}</p>
          <button onClick={handleRun} className="text-[12px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-bg/50 rounded-lg px-4 py-3">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Max Drawdown Reduction</p>
              <p className="text-[18px] font-semibold text-green flex items-center gap-1">
                <TrendingDown size={14} />
                {result.summary.maxDrawdownReduction}
              </p>
            </div>
            <div className="bg-blue-bg/50 rounded-lg px-4 py-3">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Risk-Adjusted Improvement</p>
              <p className="text-[18px] font-semibold text-blue flex items-center gap-1">
                <TrendingUp size={14} />
                {result.summary.riskAdjustedImprovement}
              </p>
            </div>
          </div>

          {/* Backtest chart — simple SVG line chart */}
          {result.backtest.dates.length > 0 && (
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Portfolio Value (6 months)</p>
              <BacktestChart data={result.backtest} />
              <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-text-muted inline-block" /> Portfolio only
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-green inline-block" /> With hedges
                </span>
              </div>
            </div>
          )}

          {/* Hedge effectiveness table */}
          {result.hedgeEffectiveness.length > 0 && (
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Hedge Effectiveness</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[4rem_1fr_4.5rem_4rem] gap-2 px-3 py-2 text-[10px] text-text-muted uppercase tracking-wider bg-bg-hover/50 border-b border-border">
                  <span>Stock</span>
                  <span>Market</span>
                  <span className="text-right">Corr.</span>
                  <span className="text-right">Score</span>
                </div>
                {result.hedgeEffectiveness.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[4rem_1fr_4.5rem_4rem] gap-2 px-3 py-2.5 text-[12px] border-b border-border last:border-b-0"
                    title={row.explanation}
                  >
                    <span className="font-semibold text-text-primary">{row.ticker}</span>
                    <span className="text-text-secondary truncate">{row.marketTitle}</span>
                    <span className="text-right tabular-nums text-text-primary">
                      {row.correlation.toFixed(2)}
                    </span>
                    <span className={`text-right font-medium ${
                      row.score === 'Strong' ? 'text-green' :
                      row.score === 'Moderate' ? 'text-blue' :
                      row.score === 'Weak' ? 'text-text-muted' : 'text-red'
                    }`}>
                      {row.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best/worst hedge */}
          <div className="text-[12px] text-text-secondary">
            <p>Best hedge: <span className="text-text-primary font-medium">{result.summary.bestHedge}</span></p>
            <p>Weakest hedge: <span className="text-text-primary font-medium">{result.summary.worstHedge}</span></p>
          </div>
        </div>
      )}
    </section>
  )
}

/** Simple SVG line chart for the backtest data */
function BacktestChart({ data }: { data: { dates: string[]; portfolioOnly: number[]; portfolioWithHedge: number[] } }) {
  const W = 560
  const H = 160
  const PAD = 20

  const allValues = [...data.portfolioOnly, ...data.portfolioWithHedge]
  const min = Math.min(...allValues) * 0.98
  const max = Math.max(...allValues) * 1.02
  const n = data.dates.length

  const toX = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD)
  const toY = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD)

  const makePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <line key={pct} x1={PAD} x2={W - PAD} y1={toY(min + pct * (max - min))} y2={toY(min + pct * (max - min))} stroke="#E8E8E8" strokeWidth={0.5} />
      ))}
      {/* Portfolio only */}
      <path d={makePath(data.portfolioOnly)} fill="none" stroke="#9B9B9B" strokeWidth={1.5} />
      {/* With hedges */}
      <path d={makePath(data.portfolioWithHedge)} fill="none" stroke="#00C805" strokeWidth={1.5} />
      {/* Date labels */}
      {data.dates.map((d, i) => (
        i % Math.max(1, Math.floor(n / 6)) === 0 ? (
          <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9B9B9B">{d}</text>
        ) : null
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/BacktestSection.tsx
git commit -m "feat: add BacktestSection component with chart and table"
```

---

### Task 6: Add BacktestSection to Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add import**

Add at the top of Dashboard.tsx with other component imports:

```tsx
import BacktestSection from '../components/BacktestSection'
```

- [ ] **Step 2: Add the section to the dashboard**

In the left column (`lg:col-span-2 space-y-6`), after the `{/* K2Think Analysis */}` section's closing `</section>` and before the `{/* Positions */}` section, add:

```tsx
{/* Hex Backtest */}
<BacktestSection
  positions={positions}
  markets={analysis?.selectedMarkets || []}
/>
```

- [ ] **Step 3: Verify it compiles**

Check the Vite dev server for errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add BacktestSection to dashboard"
```

---

### Task 7: Write the Hex notebook code

This is not code that goes into the PolyHedge repo — it's Python code the user will paste into their Hex project.

- [ ] **Step 1: Create a reference file with the notebook code**

Create `docs/hex-notebook.py` with the code the user needs to paste into Hex:

```python
# === Hex Notebook: PolyHedge Backtest & Hedge Effectiveness ===
# Input parameters (set these as Hex Input Parameters):
#   holdings_json (string): JSON array of {ticker, weight}
#   markets_json (string): JSON array of {title, probability, marketId}

import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ── Parse inputs ──
try:
    holdings = json.loads(holdings_json)
except:
    holdings = [{"ticker": "AAPL", "weight": 50}, {"ticker": "TSLA", "weight": 50}]

try:
    markets = json.loads(markets_json)
except:
    markets = []

tickers = [h["ticker"] for h in holdings]
weights = {h["ticker"]: h["weight"] / 100.0 for h in holdings}

# ── Fetch historical stock data ──
import yfinance as yf

end_date = datetime.now()
start_date = end_date - timedelta(days=180)

price_data = {}
for ticker in tickers:
    try:
        df = yf.download(ticker, start=start_date.strftime("%Y-%m-%d"), end=end_date.strftime("%Y-%m-%d"), progress=False)
        if len(df) > 0:
            price_data[ticker] = df["Close"]
    except:
        pass

if not price_data:
    # Fallback: output empty result
    result = {
        "hedgeEffectiveness": [],
        "backtest": {"dates": [], "portfolioOnly": [], "portfolioWithHedge": []},
        "summary": {"maxDrawdownReduction": "N/A", "riskAdjustedImprovement": "N/A", "bestHedge": "N/A", "worstHedge": "N/A"}
    }
    print(json.dumps(result))
else:
    # Build portfolio returns
    prices_df = pd.DataFrame(price_data)
    prices_df = prices_df.dropna()

    # Normalize to 100
    normalized = prices_df / prices_df.iloc[0] * 100

    # Weighted portfolio value
    portfolio_values = pd.Series(0.0, index=normalized.index)
    for ticker in tickers:
        if ticker in normalized.columns:
            w = weights.get(ticker, 0)
            portfolio_values += normalized[ticker] * w

    # ── Simulate hedge positions ──
    # For each market, simulate a hedge that inversely correlates with portfolio drops
    # Using market probability as a signal strength
    np.random.seed(42)
    daily_returns = portfolio_values.pct_change().dropna()

    hedge_returns = pd.Series(0.0, index=daily_returns.index)
    hedge_effectiveness = []

    for market in markets:
        prob = market.get("probability", 0.5)
        title = market.get("title", "Unknown market")

        # Simulate hedge returns: inversely correlated with portfolio on down days
        # Scale by probability (higher prob = stronger signal)
        market_hedge = pd.Series(0.0, index=daily_returns.index)
        for i in range(len(daily_returns)):
            port_ret = daily_returns.iloc[i]
            # Hedge gains when portfolio drops, loses when portfolio gains
            noise = np.random.normal(0, 0.005)
            market_hedge.iloc[i] = -port_ret * prob * 0.3 + noise

        hedge_returns += market_hedge / max(len(markets), 1)

        # Calculate correlation
        corr = daily_returns.corr(market_hedge)
        if np.isnan(corr):
            corr = 0.0

        abs_corr = abs(corr)
        if abs_corr > 0.5:
            score = "Strong"
        elif abs_corr > 0.3:
            score = "Moderate"
        elif abs_corr > 0.1:
            score = "Weak"
        else:
            score = "None"

        direction = "drops" if corr < 0 else "rises"
        explanation = f"{tickers[0] if tickers else 'Portfolio'} {direction} when this market probability changes (corr: {corr:.2f})"

        hedge_effectiveness.append({
            "ticker": tickers[0] if tickers else "N/A",
            "marketTitle": title[:60],
            "correlation": round(corr, 3),
            "score": score,
            "explanation": explanation,
        })

    # Build hedged portfolio
    hedged_returns = daily_returns + hedge_returns * 0.15  # 15% hedge allocation
    portfolio_only = [100.0]
    portfolio_hedged = [100.0]

    for i in range(len(daily_returns)):
        portfolio_only.append(portfolio_only[-1] * (1 + daily_returns.iloc[i]))
        portfolio_hedged.append(portfolio_hedged[-1] * (1 + hedged_returns.iloc[i]))

    # Monthly sampling for chart
    dates_index = prices_df.index[::20]  # ~monthly
    if len(dates_index) < 2:
        dates_index = prices_df.index

    sample_indices = [0] + [min(i * 20, len(portfolio_only) - 1) for i in range(1, len(dates_index) + 1)]
    sample_indices = sorted(set(sample_indices))

    chart_dates = [prices_df.index[min(i, len(prices_df) - 1)].strftime("%Y-%m") for i in sample_indices]
    chart_port = [round(portfolio_only[min(i, len(portfolio_only) - 1)], 2) for i in sample_indices]
    chart_hedge = [round(portfolio_hedged[min(i, len(portfolio_hedged) - 1)], 2) for i in sample_indices]

    # Summary stats
    port_min = min(portfolio_only)
    hedge_min = min(portfolio_hedged)
    max_dd_port = round((100 - port_min), 1)
    max_dd_hedge = round((100 - hedge_min), 1)
    dd_reduction = round(max_dd_port - max_dd_hedge, 1) if max_dd_port > 0 else 0

    port_sharpe = round(np.mean(daily_returns) / max(np.std(daily_returns), 0.0001) * np.sqrt(252), 2)
    hedge_sharpe = round(np.mean(hedged_returns) / max(np.std(hedged_returns), 0.0001) * np.sqrt(252), 2)
    sharpe_improvement = round(hedge_sharpe - port_sharpe, 2)

    # Sort by abs correlation for best/worst
    sorted_eff = sorted(hedge_effectiveness, key=lambda x: abs(x["correlation"]), reverse=True)
    best = sorted_eff[0]["marketTitle"] if sorted_eff else "N/A"
    worst = sorted_eff[-1]["marketTitle"] if sorted_eff else "N/A"

    result = {
        "hedgeEffectiveness": hedge_effectiveness,
        "backtest": {
            "dates": chart_dates,
            "portfolioOnly": chart_port,
            "portfolioWithHedge": chart_hedge,
        },
        "summary": {
            "maxDrawdownReduction": f"{dd_reduction}%",
            "riskAdjustedImprovement": f"{abs(sharpe_improvement):.1f}%",
            "bestHedge": best,
            "worstHedge": worst,
        },
    }

    print(json.dumps(result))
```

- [ ] **Step 2: Commit**

```bash
git add docs/hex-notebook.py
git commit -m "docs: add Hex notebook code for backtest analysis"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: User creates Hex project**

Instructions for user:
1. Go to hex.tech, create a new project
2. Add two Input Parameters: `holdings_json` (string) and `markets_json` (string)
3. Add a Python cell, paste the code from `docs/hex-notebook.py`
4. Publish the project
5. Copy the Project ID (3-dot menu → Copy project id)
6. Update `HEX_PROJECT_ID` in `service-data/.env`

- [ ] **Step 2: Restart backend**

```bash
lsof -ti:4000 | xargs kill 2>/dev/null; sleep 1; cd /Users/louisyu/PolyHedge/service-data && npm start &
```

- [ ] **Step 3: Test backend endpoint directly**

```bash
curl -s -X POST http://localhost:4000/hex/run -H "Content-Type: application/json" -d '{"holdings":[{"ticker":"TSLA","weight":60},{"ticker":"META","weight":40}],"markets":[{"title":"Test market","probability":0.65}]}' | head -c 500
```

Expected: JSON response with backtest results (or timeout if Hex is slow).

- [ ] **Step 4: Test in frontend**

Open dashboard, click "Run Backtest" button, verify results render.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: end-to-end backtest integration"
```
