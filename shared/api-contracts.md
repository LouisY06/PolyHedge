# API Contracts

Shared request/response schemas for all services. Frontend devs (Dev 3, Dev 4) can mock against these until real endpoints are live.

---

## Service-AI (`http://localhost:3002`)

### `GET /health`

**Response (200):**
```json
{ "status": "ok" }
```

---

### `POST /keywords`

Generate 4-6 thematic keywords for a stock ticker, optimized for searching Polymarket.

**Request:**
| Field | Type | Required | Description |
|---|---|---|---|
| ticker | string | yes | Stock ticker symbol (e.g., "LMT", "AAPL") |

**Response (200):**
| Field | Type | Description |
|---|---|---|
| ticker | string | Uppercase ticker |
| keywords | string[] | 4-6 thematic keywords for Polymarket search |

**Example:**
```json
// Request
{ "ticker": "LMT" }

// Response
{
  "ticker": "LMT",
  "keywords": ["war", "defense spending", "oil prices", "geopolitics", "government contracts", "NATO"]
}
```

**Error (400):**
```json
{ "error": "Invalid request", "message": "Missing required field: ticker" }
```

**Error (500):**
```json
{ "error": "AI service unavailable", "message": "Unable to generate keywords. Please try again later." }
```

---

### `POST /bundle-summary`

Generate a beginner-friendly AI explanation of why selected prediction markets relate to a stock and how they serve as a hedge.

**Request:**
| Field | Type | Required | Description |
|---|---|---|---|
| ticker | string | yes | Stock ticker symbol |
| markets | array | yes | Non-empty array of market objects |
| markets[].title | string | yes | Prediction market title |
| markets[].confidence | number | yes | Confidence percentage (0-100) |

**Response (200):**
| Field | Type | Description |
|---|---|---|
| ticker | string | Uppercase ticker |
| summary | string | Beginner-friendly AI-generated explanation |

**Example:**
```json
// Request
{
  "ticker": "LMT",
  "markets": [
    { "title": "Will Iran war escalate?", "confidence": 65 },
    { "title": "Will oil prices exceed $100?", "confidence": 42 },
    { "title": "Will NATO increase defense budget?", "confidence": 78 }
  ]
}

// Response
{
  "ticker": "LMT",
  "summary": "Lockheed Martin earns most of its revenue from defense contracts with the US government and NATO allies..."
}
```

**Error (400):**
```json
{ "error": "Invalid request", "message": "Missing required field: ticker" }
```
```json
{ "error": "Invalid request", "message": "Missing required field: markets (must be a non-empty array)" }
```

**Error (500):**
```json
{ "error": "AI service unavailable", "message": "Unable to generate bundle summary. Please try again later." }
```
