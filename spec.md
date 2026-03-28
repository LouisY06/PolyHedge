# HedgeSync — Build Prompt for Claude Code

You are building **HedgeSync**, a full-stack web app that connects a user's Robinhood stock portfolio with Polymarket prediction markets. The app uses **K2 Think V2** (MBZUAI's open-source reasoning model) to analyze each stock holding, generate risk-relevant keywords, and recommend prediction markets that hedge the user's equity exposure. It uses the **Hex API** for portfolio risk analysis dashboards. Users can see why a market is recommended and trade directly from the dashboard.

**Context**: This is being built for YHack 2026 (March 28–29). We are targeting the following prize tracks:
- **Prediction Markets** (Polymarket sponsor) — $2,000/$1,000/$500
- **Best use of Hex API** — $2,000/$1,000/$500
- **Best use of K2 Think V2** (MBZUAI) — reMarkable tablets
- **Grand Prize** — $4,000/$2,000/$1,000

---

## 1. Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **AI Layer**: K2 Think V2 (70B reasoning model by MBZUAI) — replaces Claude entirely for all AI features
- **Data Analytics**: Hex API for portfolio risk analysis dashboards
- **State**: React Context or Zustand (auth state, portfolio, trades, recommendations)
- **Data**: Mock data for v1, structured so real API integrations (Robinhood OAuth, Polymarket API) can replace mocks with minimal refactoring

---

## 2. K2 Think V2 Integration (CRITICAL — this is a prize track)

K2 Think V2 is MBZUAI's 70B parameter open-source reasoning model. It uses an OpenAI-compatible API format. The model is available on Hugging Face at `LLM360/K2-Think-V2`.

### API Access Options (try in this order):
1. **Cerebras Inference** (fastest — 2,000 tokens/sec): Check if accessible at `https://api.cerebras.ai/v1/chat/completions` with model `k2-think-v2`
2. **build.k2think.ai** — MBZUAI's official developer program. Request API access at https://build.k2think.ai/. They may provide hackathon-specific access.
3. **OpenRouter**: Available at `https://openrouter.ai/api/v1/chat/completions` — check for `mbzuai/k2-think-v2` or similar model ID
4. **Self-hosted via HuggingFace**: Model weights at `LLM360/K2-Think-V2` (requires significant GPU — last resort)
5. **Fallback**: If no K2 Think V2 API is available during the hackathon, use the K2 Think web app at https://www.k2think.ai/ as a reference and implement a mock AI service that returns hardcoded responses structured as if from K2 Think V2. Make the code clearly show K2 Think V2 as the intended model.

### API Format (OpenAI-compatible):
```javascript
const response = await fetch(K2_API_BASE_URL + "/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${K2_API_KEY}`
  },
  body: JSON.stringify({
    model: "LLM360/K2-Think-V2",  // adjust based on provider
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 1000,
    temperature: 1.0  // K2 Think V2 recommends temp=1.0 for best performance
  })
});
```

### K2 Think V2 responds with `<think>` and `<answer>` tags:
The model may return reasoning in `<think>...</think>` blocks followed by the answer in `<answer>...</answer>` blocks. Parse these appropriately — show only the answer to users, but you could optionally show the reasoning in an expandable "See AI reasoning" section (this would impress judges).

### Where K2 Think V2 is used:
1. **Keyword Generation** — Generate 8-12 risk-relevant keywords per stock
2. **Hedge Explanations** — Generate 2-3 sentence explanations for why a market hedges a stock
3. **Optional: Risk Assessment** — Deeper reasoning about portfolio-level risk correlations

Make K2 Think V2 integration prominent and well-attributed in the UI. Show "Powered by K2 Think V2" branding. The judges from MBZUAI need to clearly see their model is central to the app.

---

## 3. Hex API Integration (CRITICAL — this is a prize track)

Hex is a collaborative data workspace for analytics. Use the Hex API to create and display portfolio risk analysis dashboards.

### Hex API Basics:
- **Base URL**: `https://app.hex.tech/api/v1`
- **Auth**: OAuth 2.0 Bearer Token in header (`Authorization: Bearer <token>`)
- **Token types**: Personal access tokens (prefix `hxtp_`) or Workspace tokens (prefix `hxtw_`)

### Integration approach:
1. **Create a Hex project** that analyzes portfolio risk data (sector concentration, correlation exposure, position sizing)
2. **Use the Hex API to trigger project runs** with the user's portfolio data as input parameters:
```javascript
// Trigger a Hex project run with portfolio data
const response = await fetch(`https://app.hex.tech/api/v1/project/${HEX_PROJECT_ID}/run`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${HEX_API_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    inputParams: {
      portfolio_data: JSON.stringify(userPortfolio),
      // Pass portfolio as input parameter to the Hex notebook
    }
  })
});
```
3. **Embed the Hex dashboard** in the app using Hex's embed/share URL, or fetch run results via the API
4. **Poll for run completion**:
```javascript
// Check run status
const status = await fetch(`https://app.hex.tech/api/v1/project/${HEX_PROJECT_ID}/run/${runId}`, {
  headers: { "Authorization": `Bearer ${HEX_API_TOKEN}` }
});
```

### What the Hex dashboard should show:
- **Sector concentration pie chart** (what % of portfolio is in Defense, Tech, Energy, etc.)
- **Risk heatmap** showing correlation between holdings
- **Position sizing analysis** (which stocks dominate the portfolio by value)
- **Hedge coverage tracker** showing which positions have matching prediction market hedges vs. unhedged positions

### In the app UI:
- Add a **"Risk Analysis"** page/tab in the sidebar navigation
- This page embeds or displays the Hex-powered analytics dashboard
- Show "Powered by Hex" branding prominently
- If the Hex API isn't accessible during the hackathon, build the same visualizations natively using Recharts as a fallback, but keep the Hex integration code visible and well-documented

---

## 4. Authentication Flow

Build a login page with a two-step connection flow:

1. **"Connect Robinhood"** button — simulates OAuth. On click, set auth state flag, show a green checkmark.
2. **"Connect Polymarket"** button — simulates wallet connection. Same behavior.
3. Both must be connected before the user can access the dashboard. Redirect to dashboard once both are authenticated.
4. Design this as a clean, trustworthy fintech onboarding screen.
5. Add a disconnect option in Settings.

---

## 5. Dashboard — Main View

After authentication, the user lands on the main dashboard.

### Layout
- **Top Navbar**: App logo ("HedgeSync"), total portfolio value, daily P&L (green/red), notification bell icon, user avatar.
- **Left Sidebar** (collapsible): Navigation links — Dashboard, My Portfolio, Risk Analysis (Hex), My Trades, Settings. Collapses to hamburger on mobile.
- **Main Content Area**: Responsive grid of market recommendation cards. 3 columns on desktop, 2 on tablet, 1 on mobile.
- **Right Sidebar** (optional): Compact portfolio summary widget showing top holdings and quick stats.

### Visual Style
The app is a hybrid of two design languages:
- **Portfolio sections**: Mirror **Robinhood's** style — clean financial data, green/red for gains/losses, minimal chrome.
- **Market sections**: Mirror **Polymarket's current UI** — white/light backgrounds, subtle borders, clear typography. Go to polymarket.com and study their card layout, YES/NO button design, and trading interface closely.

---

## 6. Market Recommendation Cards

Each card mirrors Polymarket's current market card UI.

### Card contents:
- **Market question** as the title (e.g., "Will the US increase defense spending by 2026?")
- **YES price / NO price** displayed prominently (e.g., YES $0.72 / NO $0.28)
- **Volume** and **liquidity** stats
- **End date** for the market
- **Ticker badges**: Small colored badges showing which portfolio stock(s) this market relates to (e.g., `LMT`, `RTX`). If a market matches multiple stocks, show all badges.
- **"Why this hedge?"** button
- **"Powered by K2 Think V2"** subtle attribution near the AI-generated content

### Card interactions:
- Clicking the card expands it or opens a detail view
- "Why this hedge?" triggers the K2 Think V2 explainer (see section 8)
- Embedded trade widget at the bottom of each card (see section 9)

---

## 7. AI Keyword Generation (K2 Think V2)

For each stock in the user's portfolio, generate 8–12 risk-relevant keywords.

### Prompt to use:
```
System: You are K2-Think, a financial analyst created by MBZUAI. Given the stock ticker {TICKER} ({COMPANY_NAME}), generate 8-12 keywords and phrases that represent the key risk factors, sector themes, and geopolitical events that could significantly impact this stock's price. Return ONLY a JSON array of strings.
```

### Implementation:
- Pre-generate keywords for all 8 mock stocks and hardcode them in `src/data/stockKeywords.js`
- Structure `src/services/aiService.js` with a `generateKeywords(ticker, companyName)` function that currently returns hardcoded data but is wired to call K2 Think V2's API
- The service should clearly reference K2 Think V2 as the model in comments and config

### Example output:
```json
{
  "LMT": ["defense spending", "war", "NATO", "military contracts", "geopolitical tension", "Pentagon budget", "arms deals", "drone warfare", "US-China relations", "defense stocks"],
  "NVDA": ["AI chips", "GPU demand", "semiconductor export controls", "data center spending", "AI regulation", "chip shortage", "machine learning", "cloud computing", "US-China tech war", "gaming"]
}
```

---

## 8. "Why This Hedge?" AI Explainer (K2 Think V2)

When the user clicks the "Why this hedge?" button, show a 2–3 sentence explanation generated by K2 Think V2.

### Prompt to use:
```
System: You are K2-Think, a financial hedging advisor created by MBZUAI. The user holds {TICKER} ({COMPANY_NAME}). They are looking at this prediction market: "{MARKET_QUESTION}". In 2-3 sentences, explain why this prediction market could serve as a hedge for their stock position. Be specific about the correlation — explain what happens to the stock if the market resolves YES vs NO.
```

### UX behavior:
1. User clicks "Why this hedge?" button
2. Button changes to a loading spinner with "K2 Think V2 is reasoning..."
3. After response, a section smoothly slides open below the market question
4. Display the 2–3 sentence explanation
5. **Optional bonus**: Show an expandable "See K2 Think V2 reasoning" section that displays the `<think>` content from the model's response — this demonstrates the model's reasoning capabilities to judges
6. A close/collapse button to hide it again

---

## 9. Trading Interface

Each market card has an embedded trading widget mirroring **Polymarket's current trading UI**.

### Components:
- **YES / NO toggle** — two buttons, one highlighted based on selection
- **Dollar amount input** — user types how much they want to spend
- **Estimated shares** — updates in real-time as user types (calculated as amount / price)
- **"Trade" button** — executes the trade
- **Confirmation toast** — success notification with trade details

### v1 behavior:
- All trades are **simulated** — store in local state / context
- On trade execution: add to trade history, show success toast with animation
- Structure `src/services/tradeService.js` so swapping in Polymarket's API later is easy

---

## 10. Matching Algorithm

Build `src/services/matchingEngine.js` with this logic:

1. Take the full portfolio (array of stocks with their keyword sets)
2. For each Polymarket market, compare its `related_keywords` array against every stock's keyword set
3. **Score** = count of keyword overlaps, **weighted by position size** (a $18,000 NVDA position should weight matches higher than a $2,500 TSLA position)
4. **Deduplicate**: if a market matches both LMT and RTX, return it once with `matchedTickers: ["LMT", "RTX"]`
5. **Sort** by descending relevance score
6. Return the ranked, deduplicated, tagged array for the dashboard feed

---

## 11. Mock Data

### Mock Portfolio (`src/data/mockPortfolio.js`)

8 stocks across 6 sectors:

| Ticker | Company | Sector | Shares | ~Value |
|--------|---------|--------|--------|--------|
| LMT | Lockheed Martin | Defense | 25 | $11,250 |
| RTX | Raytheon Technologies | Defense | 40 | $4,800 |
| NVDA | NVIDIA | Tech | 15 | $18,000 |
| AAPL | Apple | Tech | 30 | $6,600 |
| XOM | ExxonMobil | Energy | 50 | $5,500 |
| JPM | JPMorgan Chase | Finance | 20 | $4,800 |
| PFE | Pfizer | Pharma | 100 | $2,600 |
| TSLA | Tesla | Consumer | 10 | $2,500 |

### Mock Markets (`src/data/mockMarkets.js`)

15–20 prediction markets spanning geopolitics, tech/AI, energy, economics, health, and consumer sectors. Each with: `id, question, category, yesPrice, noPrice, volume, liquidity, endDate, relatedKeywords[]`.

---

## 12. Pages & Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LoginPage` | Two-step auth |
| `/dashboard` | `Dashboard` | Recommendation feed with market cards |
| `/portfolio` | `PortfolioView` | Holdings breakdown with keyword tags |
| `/risk` | `RiskAnalysis` | **Hex-powered** portfolio risk dashboard |
| `/trades` | `TradeHistory` | All executed trades |
| `/settings` | `Settings` | Account connections, disconnect |

All routes except `/` require auth.

---

## 13. File Structure

```
hedgesync/
├── server/
│   ├── index.js                 // Express server
│   ├── routes/
│   │   ├── ai.js               // K2 Think V2 API proxy routes
│   │   ├── hex.js              // Hex API proxy routes
│   │   └── markets.js          // Market data routes
│   └── services/
│       ├── k2think.js          // K2 Think V2 API calls
│       └── hex.js              // Hex API integration
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── auth/
│   │   │   └── LoginPage.jsx
│   │   ├── portfolio/
│   │   │   ├── PortfolioSummary.jsx
│   │   │   ├── PortfolioView.jsx
│   │   │   └── StockCard.jsx
│   │   ├── markets/
│   │   │   ├── MarketCard.jsx
│   │   │   ├── TradeWidget.jsx
│   │   │   └── HedgeExplainer.jsx
│   │   ├── risk/
│   │   │   ├── RiskAnalysis.jsx       // Hex dashboard embed/display
│   │   │   ├── SectorChart.jsx        // Sector concentration pie chart
│   │   │   └── HedgeCoverage.jsx      // Hedge coverage tracker
│   │   ├── trades/
│   │   │   └── TradeHistory.jsx
│   │   └── common/
│   │       ├── Toast.jsx
│   │       ├── TickerBadge.jsx
│   │       └── PoweredBy.jsx          // "Powered by K2 Think V2" / "Powered by Hex" badges
│   ├── data/
│   │   ├── mockPortfolio.js
│   │   ├── mockMarkets.js
│   │   └── stockKeywords.js
│   ├── services/
│   │   ├── aiService.js        // K2 Think V2 calls (via server proxy)
│   │   ├── hexService.js       // Hex API calls (via server proxy)
│   │   ├── matchingEngine.js
│   │   └── tradeService.js
│   ├── hooks/
│   │   ├── usePortfolio.js
│   │   ├── useMarkets.js
│   │   └── useTrades.js
│   ├── context/
│   │   └── AppContext.jsx
│   ├── App.jsx
│   └── main.jsx
├── .env                         // K2_API_KEY, K2_API_BASE_URL, HEX_API_TOKEN, HEX_PROJECT_ID
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 14. Implementation Priorities

Build in this order (hackathon time constraint — ~22 hours):

### Phase 1 — Foundation (Hours 1-4)
1. Scaffold Vite + React + Tailwind + Express
2. Create all mock data files
3. Build Layout shell (Navbar, Sidebar, content area)
4. Build LoginPage with simulated two-step auth
5. Set up React Router and auth guards

### Phase 2 — Core Intelligence (Hours 4-8)
6. Implement matching engine
7. Build Dashboard with recommendation feed
8. Build MarketCard components (mirror Polymarket's design)
9. Add TickerBadge components
10. Wire up K2 Think V2 service (with fallback to mock)

### Phase 3 — AI, Trading & Hex (Hours 8-14)
11. Build HedgeExplainer with K2 Think V2 integration + reasoning display
12. Build TradeWidget mirroring Polymarket's UI
13. Implement simulated trade execution with toasts
14. Build TradeHistory page
15. Build Risk Analysis page with Hex API integration (or Recharts fallback)

### Phase 4 — Polish & Demo Prep (Hours 14-20)
16. Build PortfolioView with per-stock keyword tags
17. Add "Powered by K2 Think V2" and "Powered by Hex" branding throughout
18. Animations: card fade-in, trade success, sidebar collapse, explainer slide-open
19. Responsive testing
20. Final visual polish — make it look like a real Robinhood × Polymarket hybrid

### Phase 5 — Submission (Hours 20-22)
21. Record demo video (required by 11:30 AM Sunday)
22. Submit to Devpost
23. Prepare for live demo/judging at Kline Tower 205 (12:00 PM Sunday)

---

## 15. Key Technical Notes

- **No hardcoded API keys in frontend.** K2 Think V2 and Hex API calls go through Express backend. Frontend calls `/api/explain`, `/api/keywords`, `/api/risk`.
- **Environment variables**: Store `K2_API_KEY`, `K2_API_BASE_URL`, `HEX_API_TOKEN`, `HEX_PROJECT_ID` in `.env`
- **Real-time share estimate**: `estimatedShares = amount / selectedPrice`, compute on every keystroke.
- **Deduplication**: Matching engine must merge markets matching multiple stocks into one card with multiple ticker badges.
- **Toast notifications**: Use react-hot-toast or build a simple one.
- **Animations**: Cards fade in with staggered delays. HedgeExplainer slides open. Trade confirmation has success animation.
- **Color coding**: Green (#00C805) for gains, Red for losses. Match Robinhood's green.
- **K2 Think V2 branding**: Show "Powered by K2 Think V2 — MBZUAI" wherever AI-generated content appears. Consider showing the model's `<think>` reasoning as a collapsible section to impress MBZUAI judges.
- **Hex branding**: Show "Powered by Hex" on the Risk Analysis page.

---

## 16. Stretch Goals (if time allows)

- Dark mode toggle
- Portfolio risk visualization with Recharts as native backup to Hex
- Market search & filter beyond recommendations
- Notifications for new relevant markets
- Show K2 Think V2 reasoning traces in a dedicated "AI Reasoning" panel