Here's the project split into four parallel workstreams, each with their own folder and clear boundaries to minimize overlap.

---

# Team Split: Polymarket-Robinhood Hedge App

## Folder Structure
```
/
├── service-data/        → Dev 1
├── service-ai/          → Dev 2
├── frontend-core/       → Dev 3
├── frontend-experience/ → Dev 4
└── shared/              → All (read-only contracts, touched only by consensus)
```

---

## Dev 1 — `service-data/`
**Role: Data Pipeline Engineer**
Owns all external API integrations and data fetching. No UI work.

**Tasks:**
1. Set up FastAPI or Express backend server
2. Robinhood auth + `GET /positions` endpoint
3. Normalize position data to shared schema
4. Polymarket Gamma API integration — market search by keyword
5. `GET /markets?keyword=` endpoint returning top 2 markets per keyword
6. Normalize Polymarket confidence scores to 0–100%
7. Caching layer for repeated ticker/keyword lookups
8. Error handling for Robinhood auth failures and Polymarket timeouts
9. Write `shared/api-contracts.md` — the agreed response shapes that all other devs code against

**Owns:**
- `service-data/robinhood.js`
- `service-data/polymarket.js`
- `service-data/cache.js`
- `service-data/server.js`
- `service-data/routes/`

---

## Dev 2 — `service-ai/`
**Role: AI & LLM Engineer**
Owns all K2Think integration and prompt engineering. No UI work.

**Tasks:**
1. ~~Set up K2Think API client and auth~~ ✅
2. ~~Build keyword generation prompt + `POST /keywords` endpoint (ticker → 4–6 keywords)~~ ✅
3. ~~Build bundle summary prompt + `POST /bundle-summary` endpoint (stock + markets → AI explanation)~~ ✅
4. ~~Prompt template: why these markets relate to the stock, why hedging makes sense, what risk is covered~~ ✅
5. ~~Caching for repeated ticker keyword requests~~ ✅ (7-day TTL, in-memory)
6. ~~Error handling for K2Think failures (fallback message, retry logic)~~ ✅ (3 retries, exponential backoff)
7. ~~Unit-testable prompt templates (isolated from the server)~~ ✅ (30 tests passing)

**Owns:**
- `service-ai/k2think.js`
- `service-ai/prompts/keywords.js`
- `service-ai/prompts/bundle-summary.js`
- `service-ai/routes/`
- `service-ai/server.js`

---

## Dev 3 — `frontend-core/`
**Role: Core Frontend Engineer**
Owns the main app shell, data-connected views, and all API wiring on the frontend. No dial, no bundle builder UI.

**Tasks:**
1. Set up React app, routing, and global state (Zustand or Context)
2. Robinhood connect/login flow on first launch
3. **Positions Page** — stock holding cards (ticker, value, gain/loss)
4. Under each stock card, fetch and render associated Polymarket market tiles
5. Each market tile: title, confidence %, volume, end date, Polymarket link
6. Loading skeletons for all async fetches
7. Error states for all failed API calls
8. Local storage persistence for saved bundles
9. Mobile-responsive layout for Positions Page

**Owns:**
- `frontend-core/src/app.jsx`
- `frontend-core/src/pages/PositionsPage.jsx`
- `frontend-core/src/components/StockCard.jsx`
- `frontend-core/src/components/MarketTile.jsx`
- `frontend-core/src/store/`
- `frontend-core/src/api/`

---

## Dev 4 — `frontend-experience/`
**Role: UX & Features Engineer**
Owns the Index Builder, hedge dial, AI summaries, and all interactive/educational UI. Pulls data from the same shared API contracts but builds no data-fetching logic.

**Tasks:**
1. **Index Builder Page** — select stocks + markets to bundle
2. Bundle Card component — displays a named bundle of stocks and markets
3. Bundle naming and save flow
4. AI Summary section — fetch from `service-ai` and render under each bundle
5. Collapsible summary panel with loading state
6. **Hedge Dial component** — slider 0–100%, showing capital split, loss reduction, upside retained
7. Dynamic plain-English tooltip that updates as dial moves
8. **"What is hedging?" explainer modal** — beginner-friendly static content
9. Mobile-responsive layout for Index Builder Page

**Owns:**
- `frontend-experience/src/pages/IndexBuilderPage.jsx`
- `frontend-experience/src/components/BundleCard.jsx`
- `frontend-experience/src/components/HedgeDial.jsx`
- `frontend-experience/src/components/AISummary.jsx`
- `frontend-experience/src/components/HedgeExplainerModal.jsx`

---

## `shared/` — Consensus Zone
No one edits this alone. Changes require agreement from all affected devs.

```
shared/
├── api-contracts.md       # Request/response schemas (written by Dev 1 first)
├── types.ts               # Shared TypeScript types (Position, Market, Bundle)
└── constants.js           # API base URLs, config keys
```

---

## Coordination Rules
- **Dev 1 writes `api-contracts.md` first** — Devs 3 and 4 mock their API calls against it until the real endpoints are live
- **Dev 2 and Dev 1 agree on a single base URL pattern** before either writes routes
- **Devs 3 and 4 never touch each other's component files** — if a component is needed by both, it goes into a `shared/components/` folder by consensus
- Each folder is its own Git repo or subpackage — PRs never cross folder boundaries