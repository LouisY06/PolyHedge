Here's a spec sheet for your **Polymarket + Robinhood Hedging Dashboard** project.

---

# Project Spec Sheet: Polymarket-Robinhood Hedge Index App

## Overview
A web app that pulls a user's stock positions from Robinhood, maps each stock to relevant Polymarket prediction markets using an LLM, and allows users to construct hybrid index bundles (stocks + prediction markets) with AI-powered hedging analysis.

---

## Tech Stack
- **Frontend:** React
- **LLM:** K2Think API
- **Market Data:** Polymarket API (CLOB API + Gamma Markets API)
- **Brokerage:** Robinhood API (via `robin_stocks` or unofficial API)
- **Backend:** Node.js or Python (FastAPI recommended)

---

## Task List

### Phase 1 — Backend: Robinhood Integration
1. Set up backend server (FastAPI or Express)
2. Implement Robinhood authentication (OAuth or token-based via `robin_stocks`)
3. Build endpoint `GET /positions` — returns user's current stock holdings (ticker, shares, current value, cost basis)
4. Normalize position data into a clean internal schema

---

### Phase 2 — Backend: LLM Keyword Generation (K2Think)
5. Integrate K2Think API client
6. Build prompt template: given a stock ticker + name, generate 4–6 Polymarket-searchable keywords (e.g. `TSLA` → `["electric vehicles", "Elon Musk", "autonomous driving", "EV regulation"]`)
7. Build endpoint `POST /keywords` — accepts a ticker, returns keyword list
8. Add caching layer so the same ticker doesn't get re-queried on every load

---

### Phase 3 — Backend: Polymarket Integration
9. Integrate Polymarket Gamma API for market search by keyword
10. Build endpoint `GET /markets?keyword=` — returns top 2 markets per keyword (title, probability/confidence %, volume, closing date, description)
11. Aggregate results: for each stock position, return a flat list of associated markets
12. Normalize Polymarket confidence scores to a 0–100% display format

---

### Phase 4 — Frontend: Core UI
13. Build app shell with navigation (Positions view, Index Builder view)
14. Build **Positions Page** — list of Robinhood holdings as cards (ticker, value, gain/loss)
15. Under each stock card, render its associated Polymarket markets (top 2 per keyword)
16. Each market tile shows: title, confidence %, volume, end date, and a link to Polymarket

---

### Phase 5 — Frontend: Hedge Index Builder
17. Allow user to select one or more stocks + one or more Polymarket markets to bundle into an "index"
18. Build **Index Bundle Card** — shows selected stocks and markets together as a named bundle
19. Add AI Summary section on each bundle (see Phase 6)
20. Allow user to name and save multiple bundles

---

### Phase 6 — Backend + Frontend: AI Bundle Summary (K2Think)
21. Build prompt template: given a stock and a set of Polymarket markets, generate a plain-English explanation of (a) why these markets relate to the stock, (b) why hedging with them is a good idea, (c) what risk they protect against
22. Build endpoint `POST /bundle-summary` — accepts stock + market list, returns AI summary
23. Render summary as a collapsible section under each bundle card

---

### Phase 7 — Frontend: Hedge Dial
24. Build a **Hedge Dial / Slider** component (0%–100%) representing how much of the position value is hedged via prediction markets
25. As user moves the dial, display:
   - Estimated capital allocated to markets vs. stocks
   - Projected worst-case loss reduction (simplified: hedge % × inverse market correlation)
   - Projected upside retained
26. Add a plain-English tooltip/explainer that updates dynamically: *"At 30% hedge, you protect against X while retaining Y% of upside"*
27. Add a simple explainer modal: **"What is hedging?"** — a beginner-friendly static explanation

---

### Phase 8 — Polish & Auth
28. Add loading skeletons for all async data fetches
29. Add error states for failed API calls (Robinhood auth failure, Polymarket timeout, K2Think error)
30. Add Robinhood login/connect flow on first launch
31. Add local storage or backend persistence for saved bundles
32. Make the app responsive (mobile-friendly layout)

---

### Phase 9 — (Optional Stretch Goals)
33. Allow user to export a bundle as a PDF summary
34. Add historical confidence trend chart per Polymarket market
35. Add portfolio-level hedge score (aggregate across all bundles)
36. Add alerts: notify user when a linked Polymarket market confidence shifts >10%

---

## Key Data Schemas

**Position**
`{ ticker, companyName, shares, currentValue, costBasis, gainLoss }`

**Market**
`{ marketId, title, keyword, confidencePct, volume, closeDate, polymarketUrl }`

**Bundle**
`{ bundleId, name, stocks[], markets[], hedgeDial (0-100), aiSummary }`

---

## Notes for Claude Code
- Tackle one phase at a time in order
- Confirm K2Think API auth method before Phase 2
- Polymarket's CLOB API handles live pricing; Gamma API handles market search — both will be needed
- Robinhood has no official public API; confirm which library/method to use before Phase 1
- The hedge dial math in Phase 7 is intentionally simplified — no need for options-pricing models