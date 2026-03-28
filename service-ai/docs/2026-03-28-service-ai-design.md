# Service-AI Design Spec

**Date:** 2026-03-28
**Owner:** Dev 2 — AI & LLM Engineer
**Service:** `service-ai/` — K2Think LLM integration for keyword generation and bundle summaries

---

## Overview

service-ai is a lightweight Express.js server (port 3002) that wraps the K2ThinkV2 LLM API. It provides two endpoints:

1. **`POST /keywords`** — Given a stock ticker, generate 4–6 thematic keywords representing events, risks, and themes that affect that stock. These keywords are then used by service-data (Dev 1) to search Polymarket for relevant prediction markets.

2. **`POST /bundle-summary`** — Given a stock ticker and a set of selected prediction markets, generate a beginner-friendly AI explanation of why these markets relate to the stock, how they serve as a hedge, and what risk each one covers.

The end goal is that users bundle stocks and prediction markets together like an index fund. The AI summary makes each bundle feel coherent by explaining the strategy as a whole.

---

## Architecture

```
service-ai/
├── server.js              # Express app, port 3002
├── k2think.js             # Raw fetch() wrapper — auth, retries, timeout
├── cache.js               # In-memory Map with 7-day TTL
├── prompts/
│   ├── keywords.js        # Prompt template: ticker → 4-6 keywords
│   └── bundle-summary.js  # Prompt template: stock + markets → educational summary
├── routes/
│   ├── keywords.js        # POST /keywords route handler
│   └── bundle-summary.js  # POST /bundle-summary route handler
├── package.json
└── .env                   # K2THINK_API_KEY (gitignored)
```

### Key Design Decisions

- **Direct fetch() to K2Think** — No OpenAI SDK or abstraction layer. K2Think uses an OpenAI-compatible API, but we call it directly for transparency and zero extra dependencies.
- **Frontend orchestrates** — service-ai and service-data never talk to each other. The frontend calls service-ai for keywords, then calls service-data to search Polymarket with those keywords. This keeps services fully independent and easy to develop in parallel.
- **Prompts as pure functions** — Each prompt template is a standalone function that takes inputs and returns a messages array. Unit-testable without network calls.

---

## K2Think Client (`k2think.js`)

A thin wrapper around `fetch()` to the K2Think API.

- **Base URL:** `https://api.k2think.ai/v1/chat/completions`
- **Model:** `MBZUAI-IFM/K2-Think-v2`
- **Auth:** Bearer token from `K2THINK_API_KEY` env var
- **No streaming** — We need the full response to parse structured output
- **Retry logic:** 3 attempts with exponential backoff (1s, 2s, 4s)
- **Timeout:** 30 seconds per request
- **Returns:** Parsed content string from the response, or throws an error

---

## Endpoints

### `POST /keywords`

Generates thematic keywords for a stock ticker. Keywords represent themes, events, and risk factors that affect the stock — optimized for searching Polymarket.

**Request:**
```json
{
  "ticker": "LMT"
}
```

**Response (200):**
```json
{
  "ticker": "LMT",
  "keywords": ["war", "defense spending", "oil prices", "geopolitics", "government contracts", "NATO"]
}
```

**Error (400):**
```json
{
  "error": "Invalid request",
  "message": "Missing required field: ticker"
}
```

**Error (500):**
```json
{
  "error": "AI service unavailable",
  "message": "Unable to generate keywords. Please try again later."
}
```

**Example keyword logic:**
- `AAPL` → iPhone sales, tech regulation, AI competition, Apple earnings, consumer spending
- `LMT` → war, defense spending, oil prices, geopolitics, government contracts, NATO
- `XOM` → oil prices, climate policy, OPEC, energy demand, carbon regulation

The LLM doesn't need live data. It uses its knowledge of what the company does and what macro themes affect it. Polymarket provides the live layer when these keywords are searched.

### `POST /bundle-summary`

Generates a beginner-friendly explanation of why selected prediction markets relate to a stock and how they serve as a hedge.

**Request:**
```json
{
  "ticker": "LMT",
  "markets": [
    { "title": "Will Iran war escalate?", "confidence": 65 },
    { "title": "Will oil prices exceed $100?", "confidence": 42 },
    { "title": "Will NATO increase defense budget?", "confidence": 78 }
  ]
}
```

**Response (200):**
```json
{
  "ticker": "LMT",
  "summary": "Lockheed Martin earns most of its revenue from defense contracts with the US government and NATO allies..."
}
```

**Summary content requirements:**
- Explain cause-and-effect: why each market relates to the stock
- Include directional reasoning where appropriate (e.g., "historically, defense stocks tend to rise during active conflicts")
- Explain why hedging with these specific markets protects the user
- Frame as a unified index/bundle strategy — why these pieces work together
- Beginner-friendly language, no jargon without explanation

**Error responses:** Same pattern as `/keywords`.

---

## Caching (`cache.js`)

- In-memory Map with TTL tracking
- **Keywords are cached** — key is the ticker, TTL is 7 days. A company's thematic risk factors (defense → war → oil) are structurally stable.
- **Bundle summaries are NOT cached** — the input varies per user (different market selections).
- If cache read/write fails, proceed without cache. Never break a request over a cache issue.

---

## Prompt Design

Prompts live in `prompts/` as pure functions. Each takes structured input and returns a messages array ready for the K2Think API.

### `prompts/keywords.js`

```js
function buildKeywordsPrompt(ticker) {
  return [
    {
      role: "user",
      content: `Given the stock ticker ${ticker}, generate 4-6 keywords...`
    }
  ];
}
```

The prompt instructs the LLM to:
- Identify the company and its core business
- Think about macro themes, events, and risk factors that move the stock
- Return keywords optimized for searching a prediction market platform
- Return as a JSON array for easy parsing

### `prompts/bundle-summary.js`

```js
function buildBundleSummaryPrompt(ticker, markets) {
  return [
    {
      role: "user",
      content: `Explain to a beginner investor why these prediction markets relate to ${ticker}...`
    }
  ];
}
```

The prompt instructs the LLM to:
- Explain what the company does in simple terms
- For each market, explain the cause-and-effect link to the stock
- Include directional reasoning where appropriate
- Explain the hedging benefit — what risk is covered
- Frame the bundle as a unified investment strategy

### Testability

Prompt functions are unit-testable without the API:
- Verify output format (returns array of message objects)
- Verify ticker/markets are interpolated correctly
- Verify prompt contains required instruction elements

---

## Error Handling

| Scenario | Behavior |
|---|---|
| K2Think down/slow | Retry 3x with exponential backoff (1s, 2s, 4s), then return 500 |
| K2Think returns gibberish | Attempt to parse; if keywords can't be extracted, return 500 |
| Invalid/missing ticker | Return 400 with validation message |
| Missing markets in bundle-summary | Return 400 with validation message |
| Cache failure | Log warning, proceed without cache |
| Malformed K2Think response | Return 500 with "AI service unavailable" message |

---

## API Contracts for Other Developers

**For Dev 1 (service-data):** No direct integration needed. Services are independent. Dev 1's `GET /markets?keyword=` endpoint is called by the frontend with keywords from our `/keywords` response.

**For Dev 3/4 (frontend):** The frontend orchestrates the flow:
1. Call `POST http://localhost:3002/keywords` with a ticker
2. Use the returned keywords to call service-data's market search
3. User selects markets and bundles them
4. Call `POST http://localhost:3002/bundle-summary` with ticker + selected markets
5. Display the summary in the bundle UI

**Base URL:** `http://localhost:3002`

---

## Dependencies

- `express` — HTTP server
- `dotenv` — Load .env file
- No other runtime dependencies. Raw `fetch()` (Node 18+ built-in) for K2Think calls.

**Dev dependencies:**
- Testing framework TBD (likely `jest` or `vitest`)
