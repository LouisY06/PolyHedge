# Gmail Portfolio Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users connect Gmail to auto-import their Robinhood trade history as portfolio positions.

**Architecture:** Frontend initiates Google OAuth code flow, sends the auth code to a new `POST /auth/google` backend endpoint. Backend exchanges the code for an access token, fetches all Robinhood emails from Gmail API, parses trade confirmations, computes net positions, enriches with Yahoo Finance, and returns positions. Frontend shows a preview for confirmation before importing to dashboard.

**Tech Stack:** Google Identity Services (frontend), googleapis npm package (backend), Gmail API

---

## File Structure

### New files
- `service-data/gmail.js` — Gmail API client: exchange auth code, fetch Robinhood emails, parse trades, compute net positions
- `service-data/routes/auth-google.js` — Express route handler for `POST /auth/google`
- `frontend/src/pages/LandingPage.tsx` — New entry page with "Connect Gmail" and "Import CSV/Manual" buttons
- `frontend/src/pages/GmailPreviewPage.tsx` — Preview table of detected positions with confirm/remove

### Modified files
- `service-data/server.js` — Mount new `/auth/google` route
- `service-data/.env` — Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `service-data/package.json` — Add `googleapis` dependency
- `frontend/src/App.tsx` — Add react-router-dom, update routing
- `frontend/src/api/client.ts` — Add `importFromGmail()` function
- `frontend/index.html` — Add Google Identity Services script tag

---

### Task 1: Install googleapis dependency

**Files:**
- Modify: `service-data/package.json`

- [ ] **Step 1: Install the package**

```bash
cd /Users/louisyu/PolyHedge/service-data && npm install googleapis
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const { google } = require('googleapis'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add service-data/package.json service-data/package-lock.json
git commit -m "chore: add googleapis dependency for Gmail integration"
```

---

### Task 2: Add Google credentials to .env

**Files:**
- Modify: `service-data/.env`

- [ ] **Step 1: Add env vars**

Add these two lines to `service-data/.env`:

```
GOOGLE_CLIENT_ID=182734869118-anq8m434ve86scrdnl83ehj2uph2qik7.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

- [ ] **Step 2: Verify dotenv loads them**

```bash
cd /Users/louisyu/PolyHedge/service-data && node -e "require('dotenv').config(); console.log(!!process.env.GOOGLE_CLIENT_ID, !!process.env.GOOGLE_CLIENT_SECRET)"
```

Expected: `true true`

Note: Do NOT commit .env files.

---

### Task 3: Build Gmail API client (`gmail.js`)

**Files:**
- Create: `service-data/gmail.js`

- [ ] **Step 1: Write the gmail.js module**

```js
const { google } = require("googleapis");

/**
 * Exchange a Google OAuth authorization code for an access token.
 * Returns the access token string.
 */
async function exchangeCode(code, redirectUri) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
  const { tokens } = await oauth2Client.getToken(code);
  return tokens.access_token;
}

/**
 * Fetch all Robinhood emails from the user's Gmail.
 * Returns an array of { subject, body } objects.
 */
async function fetchRobinhoodEmails(accessToken) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const emails = [];
  let pageToken = null;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "from:robinhood.com",
      maxResults: 100,
      pageToken: pageToken || undefined,
    });

    const messages = res.data.messages || [];
    pageToken = res.data.nextPageToken || null;

    // Fetch each message's full content
    const fetches = messages.map((m) =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "full",
      })
    );

    const results = await Promise.allSettled(fetches);

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const msg = result.value.data;

      const subjectHeader = (msg.payload.headers || []).find(
        (h) => h.name.toLowerCase() === "subject"
      );
      const subject = subjectHeader ? subjectHeader.value : "";
      const body = extractBody(msg.payload);

      emails.push({ subject, body });
    }
  } while (pageToken);

  return emails;
}

/**
 * Recursively extract text/plain or text/html body from a Gmail message payload.
 */
function extractBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  if (payload.parts) {
    // Prefer text/plain, fall back to text/html
    for (const mimeType of ["text/plain", "text/html"]) {
      for (const part of payload.parts) {
        if (part.mimeType === mimeType && part.body && part.body.data) {
          return Buffer.from(part.body.data, "base64url").toString("utf-8");
        }
        // Check nested parts (multipart/alternative inside multipart/mixed)
        if (part.parts) {
          for (const sub of part.parts) {
            if (sub.mimeType === mimeType && sub.body && sub.body.data) {
              return Buffer.from(sub.body.data, "base64url").toString("utf-8");
            }
          }
        }
      }
    }
  }
  return "";
}

/**
 * Parse trade confirmation details from Robinhood email content.
 * Looks for patterns like:
 *   "You bought 10 shares of AAPL at $175.50"
 *   "Your market order to buy 5 shares of TSLA was executed at $242.30"
 *   "Your limit order to sell 3 shares of MSFT was executed at $415.20"
 *
 * Returns an array of { action, ticker, shares, price } objects.
 */
function parseTradeEmails(emails) {
  const trades = [];

  // Patterns for Robinhood trade confirmation emails
  const patterns = [
    // "You bought/sold X share(s) of TICKER at $PRICE"
    /you\s+(bought|sold)\s+([\d,.]+)\s+shares?\s+of\s+([A-Z]{1,5})\s+at\s+\$?([\d,.]+)/gi,
    // "market/limit order to buy/sell X share(s) of TICKER was executed at $PRICE"
    /order\s+to\s+(buy|sell)\s+([\d,.]+)\s+shares?\s+of\s+([A-Z]{1,5})\s+(?:was\s+)?executed\s+at\s+\$?([\d,.]+)/gi,
    // "Your X share(s) of TICKER were sold/bought at $PRICE"
    /your\s+([\d,.]+)\s+shares?\s+of\s+([A-Z]{1,5})\s+(?:were|was)\s+(bought|sold)\s+at\s+\$?([\d,.]+)/gi,
  ];

  for (const email of emails) {
    const text = `${email.subject} ${email.body}`;

    // Pattern 1 & 2: action, shares, ticker, price
    for (const pattern of [patterns[0], patterns[1]]) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        const action = match[1].toLowerCase().includes("buy") || match[1].toLowerCase().includes("bought") ? "buy" : "sell";
        const shares = parseFloat(match[2].replace(/,/g, ""));
        const ticker = match[3].toUpperCase();
        const price = parseFloat(match[4].replace(/,/g, ""));
        if (shares > 0 && price > 0 && ticker.length <= 5) {
          trades.push({ action, ticker, shares, price });
        }
      }
    }

    // Pattern 3: shares, ticker, action, price (different order)
    {
      let match;
      patterns[2].lastIndex = 0;
      while ((match = patterns[2].exec(text)) !== null) {
        const shares = parseFloat(match[1].replace(/,/g, ""));
        const ticker = match[2].toUpperCase();
        const action = match[3].toLowerCase().includes("buy") || match[3].toLowerCase().includes("bought") ? "buy" : "sell";
        const price = parseFloat(match[4].replace(/,/g, ""));
        if (shares > 0 && price > 0 && ticker.length <= 5) {
          trades.push({ action, ticker, shares, price });
        }
      }
    }
  }

  return trades;
}

/**
 * Aggregate individual trades into net positions.
 * For each ticker, computes total shares (buys - sells) and weighted average cost.
 * Excludes tickers with net shares <= 0 (fully sold).
 *
 * Returns array of { ticker, shares, averageCost }.
 */
function computeNetPositions(trades) {
  const map = {};

  for (const trade of trades) {
    if (!map[trade.ticker]) {
      map[trade.ticker] = { ticker: trade.ticker, totalShares: 0, totalCost: 0, buyShares: 0 };
    }
    const entry = map[trade.ticker];

    if (trade.action === "buy") {
      entry.totalShares += trade.shares;
      entry.totalCost += trade.shares * trade.price;
      entry.buyShares += trade.shares;
    } else {
      entry.totalShares -= trade.shares;
    }
  }

  return Object.values(map)
    .filter((e) => e.totalShares > 0)
    .map((e) => ({
      ticker: e.ticker,
      shares: Math.round(e.totalShares * 1000) / 1000,
      averageCost: e.buyShares > 0 ? Math.round((e.totalCost / e.buyShares) * 100) / 100 : null,
    }));
}

module.exports = {
  exchangeCode,
  fetchRobinhoodEmails,
  extractBody,
  parseTradeEmails,
  computeNetPositions,
};
```

- [ ] **Step 2: Smoke test the module loads**

```bash
cd /Users/louisyu/PolyHedge/service-data && node -e "const g = require('./gmail'); console.log(Object.keys(g))"
```

Expected: `[ 'exchangeCode', 'fetchRobinhoodEmails', 'extractBody', 'parseTradeEmails', 'computeNetPositions' ]`

- [ ] **Step 3: Commit**

```bash
git add service-data/gmail.js
git commit -m "feat: add Gmail API client for Robinhood email parsing"
```

---

### Task 4: Write tests for email parsing and position computation

**Files:**
- Create: `service-data/__tests__/gmail.test.js`

- [ ] **Step 1: Write the test file**

```js
const { parseTradeEmails, computeNetPositions } = require("../gmail");

describe("parseTradeEmails", () => {
  test("parses 'You bought X shares of TICKER at $PRICE'", () => {
    const emails = [
      { subject: "Your order was executed", body: "You bought 10 shares of AAPL at $175.50 per share." },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toEqual([
      { action: "buy", ticker: "AAPL", shares: 10, price: 175.5 },
    ]);
  });

  test("parses 'You sold X shares of TICKER at $PRICE'", () => {
    const emails = [
      { subject: "Your order was executed", body: "You sold 5 shares of TSLA at $242.30 per share." },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toEqual([
      { action: "sell", ticker: "TSLA", shares: 5, price: 242.3 },
    ]);
  });

  test("parses 'market order to buy' pattern", () => {
    const emails = [
      { subject: "Order executed", body: "Your market order to buy 3 shares of MSFT was executed at $415.20" },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toEqual([
      { action: "buy", ticker: "MSFT", shares: 3, price: 415.2 },
    ]);
  });

  test("parses 'limit order to sell' pattern", () => {
    const emails = [
      { subject: "Order executed", body: "Your limit order to sell 20 shares of NVDA was executed at $890.00" },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toEqual([
      { action: "sell", ticker: "NVDA", shares: 20, price: 890 },
    ]);
  });

  test("parses multiple trades from multiple emails", () => {
    const emails = [
      { subject: "", body: "You bought 10 shares of AAPL at $175.50" },
      { subject: "", body: "You bought 5 shares of AAPL at $180.00" },
      { subject: "", body: "You sold 3 shares of AAPL at $190.00" },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toHaveLength(3);
    expect(trades[0]).toEqual({ action: "buy", ticker: "AAPL", shares: 10, price: 175.5 });
    expect(trades[1]).toEqual({ action: "buy", ticker: "AAPL", shares: 5, price: 180 });
    expect(trades[2]).toEqual({ action: "sell", ticker: "AAPL", shares: 3, price: 190 });
  });

  test("ignores emails with no trade info", () => {
    const emails = [
      { subject: "Welcome to Robinhood!", body: "Thanks for signing up" },
      { subject: "Your dividend", body: "You received a dividend of $5.00" },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toEqual([]);
  });

  test("handles fractional shares", () => {
    const emails = [
      { subject: "", body: "You bought 0.5 shares of AMZN at $3,400.00" },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toEqual([
      { action: "buy", ticker: "AMZN", shares: 0.5, price: 3400 },
    ]);
  });
});

describe("computeNetPositions", () => {
  test("computes net positions from buys and sells", () => {
    const trades = [
      { action: "buy", ticker: "AAPL", shares: 10, price: 175 },
      { action: "buy", ticker: "AAPL", shares: 5, price: 180 },
      { action: "sell", ticker: "AAPL", shares: 3, price: 190 },
    ];
    const positions = computeNetPositions(trades);
    expect(positions).toEqual([
      {
        ticker: "AAPL",
        shares: 12,
        averageCost: 176.67, // (10*175 + 5*180) / 15 = 2650/15 = 176.67
      },
    ]);
  });

  test("excludes fully sold positions", () => {
    const trades = [
      { action: "buy", ticker: "TSLA", shares: 5, price: 200 },
      { action: "sell", ticker: "TSLA", shares: 5, price: 250 },
    ];
    const positions = computeNetPositions(trades);
    expect(positions).toEqual([]);
  });

  test("handles multiple tickers", () => {
    const trades = [
      { action: "buy", ticker: "AAPL", shares: 10, price: 175 },
      { action: "buy", ticker: "MSFT", shares: 5, price: 400 },
    ];
    const positions = computeNetPositions(trades);
    expect(positions).toHaveLength(2);
    expect(positions.find((p) => p.ticker === "AAPL")).toEqual({ ticker: "AAPL", shares: 10, averageCost: 175 });
    expect(positions.find((p) => p.ticker === "MSFT")).toEqual({ ticker: "MSFT", shares: 5, averageCost: 400 });
  });

  test("returns empty array for no trades", () => {
    expect(computeNetPositions([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd /Users/louisyu/PolyHedge/service-data && npx jest __tests__/gmail.test.js --verbose
```

Expected: All tests pass.

- [ ] **Step 3: Fix any failures, then commit**

```bash
git add service-data/__tests__/gmail.test.js
git commit -m "test: add tests for Gmail trade email parsing and position computation"
```

---

### Task 5: Build the auth-google route

**Files:**
- Create: `service-data/routes/auth-google.js`
- Modify: `service-data/server.js`

- [ ] **Step 1: Create the route handler**

Create `service-data/routes/auth-google.js`:

```js
const {
  exchangeCode,
  fetchRobinhoodEmails,
  parseTradeEmails,
  computeNetPositions,
} = require("../gmail");
const { getQuotes } = require("../yahoo-finance");
const { enrichPositions } = require("../positions");

async function handler(req, res) {
  const { code, redirectUri } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing required field: code" });
  }

  try {
    // Step 1: Exchange auth code for access token
    console.log("[/auth/google] Exchanging auth code for token...");
    const accessToken = await exchangeCode(code, redirectUri || "http://localhost:5173");

    // Step 2: Fetch all Robinhood emails
    console.log("[/auth/google] Fetching Robinhood emails...");
    const emails = await fetchRobinhoodEmails(accessToken);
    console.log(`[/auth/google] Found ${emails.length} Robinhood emails`);

    if (emails.length === 0) {
      return res.json({
        positions: [],
        tradesFound: 0,
        emailsScanned: 0,
        message: "No Robinhood emails found in this Gmail account",
      });
    }

    // Step 3: Parse trade confirmations
    const trades = parseTradeEmails(emails);
    console.log(`[/auth/google] Parsed ${trades.length} trades`);

    if (trades.length === 0) {
      return res.json({
        positions: [],
        tradesFound: 0,
        emailsScanned: emails.length,
        message: "Found Robinhood emails but no trade confirmations detected",
      });
    }

    // Step 4: Compute net positions
    const netPositions = computeNetPositions(trades);

    if (netPositions.length === 0) {
      return res.json({
        positions: [],
        tradesFound: trades.length,
        emailsScanned: emails.length,
        message: "All positions have been fully sold",
      });
    }

    // Step 5: Enrich with Yahoo Finance
    const tickers = netPositions.map((p) => p.ticker);
    let enriched;
    try {
      const quoteMap = await getQuotes(tickers);
      enriched = enrichPositions(netPositions, quoteMap);
    } catch (err) {
      console.error("[/auth/google] Yahoo Finance enrichment failed:", err.message);
      enriched = netPositions.map((p) => ({
        ...p,
        name: p.ticker,
        currentPrice: null,
        marketValue: null,
        gainLoss: null,
        gainLossPercent: null,
      }));
    }

    return res.json({
      positions: enriched,
      tradesFound: trades.length,
      emailsScanned: emails.length,
    });
  } catch (err) {
    console.error("[/auth/google] Error:", err.message);

    if (err.message.includes("invalid_grant") || err.message.includes("invalid_client")) {
      return res.status(401).json({ error: "Google authentication failed", detail: err.message });
    }

    return res.status(500).json({ error: "Failed to import from Gmail", detail: err.message });
  }
}

module.exports = { handler };
```

- [ ] **Step 2: Mount the route in server.js**

In `service-data/server.js`, add the import near the other route imports (after line 16):

```js
const { handler: authGoogleHandler } = require("./routes/auth-google");
```

Add the route after the `/analyze` route (after the analyze section):

```js
// ---------------------------------------------------------------------------
// POST /auth/google — Gmail portfolio import
// ---------------------------------------------------------------------------
app.post("/auth/google", authGoogleHandler);
```

- [ ] **Step 3: Restart backend and test the endpoint responds**

```bash
curl -s -X POST http://localhost:4000/auth/google -H "Content-Type: application/json" -d '{}' | head -c 200
```

Expected: `{"error":"Missing required field: code"}`

- [ ] **Step 4: Commit**

```bash
git add service-data/routes/auth-google.js service-data/server.js
git commit -m "feat: add POST /auth/google endpoint for Gmail portfolio import"
```

---

### Task 6: Add Google Identity Services script to frontend

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Add the GIS script tag**

In `frontend/index.html`, add this line inside `<head>` before the closing `</head>` tag:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "chore: add Google Identity Services script to index.html"
```

---

### Task 7: Add `importFromGmail()` to API client

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Add the function**

Add this to `frontend/src/api/client.ts` after the `submitManualPositions` function (after line 52):

```ts
// ── Gmail import ──────────────────────────────────────

export interface GmailImportResult {
  positions: BackendPosition[]
  tradesFound: number
  emailsScanned: number
  message?: string
}

export async function importFromGmail(code: string, redirectUri: string): Promise<GmailImportResult> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gmail import failed' }))
    throw new Error(err.error || 'Gmail import failed')
  }
  return res.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat: add importFromGmail API client function"
```

---

### Task 8: Create LandingPage

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`

- [ ] **Step 1: Create the landing page component**

```tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Mail, Upload, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { importFromGmail } from '../api/client'
import { useStore } from '../store/useStore'
import type { Position } from '../types'

const GOOGLE_CLIENT_ID = '182734869118-anq8m434ve86scrdnl83ehj2uph2qik7.apps.googleusercontent.com'

interface BackendPosition {
  ticker: string
  name: string
  shares: number
  averageCost: number | null
  currentPrice: number | null
  marketValue: number | null
  gainLoss: number | null
  gainLossPercent: number | null
}

function toFrontendPosition(bp: BackendPosition): Position {
  return {
    ticker: bp.ticker,
    name: bp.name || bp.ticker,
    shares: bp.shares,
    avgCost: bp.averageCost ?? 0,
    currentPrice: bp.currentPrice ?? bp.averageCost ?? 0,
    marketValue: bp.marketValue ?? bp.shares * (bp.currentPrice ?? bp.averageCost ?? 0),
    gainLoss: bp.gainLoss ?? 0,
    gainLossPercent: bp.gainLossPercent ?? 0,
  }
}

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setGmailPreviewPositions = useStore((s) => s.setGmailPreviewPositions)

  const handleGmailConnect = () => {
    setLoading(true)
    setError('')

    const redirectUri = window.location.origin

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      ux_mode: 'popup',
      redirect_uri: redirectUri,
      callback: async (response: { code?: string; error?: string }) => {
        if (response.error || !response.code) {
          setError(response.error || 'Google sign-in was cancelled')
          setLoading(false)
          return
        }

        try {
          const result = await importFromGmail(response.code, redirectUri)

          if (result.positions.length === 0) {
            setError(result.message || 'No positions found in your Robinhood emails')
            setLoading(false)
            return
          }

          const positions = (result.positions as unknown as BackendPosition[]).map(toFrontendPosition)
          setGmailPreviewPositions(positions)
          navigate('/gmail-preview')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Gmail import failed')
        } finally {
          setLoading(false)
        }
      },
    })

    client.requestCode()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)', top: '10%', left: '15%' }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', bottom: '10%', right: '15%' }}
        animate={{ x: [0, -25, 15, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="w-full max-w-[400px] relative z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 8px 32px rgba(59,130,246,0.4)' }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield size={28} className="text-white" strokeWidth={2} />
          </motion.div>
          <h1 className="text-[32px] font-extrabold text-white tracking-tight">PolyHedge</h1>
          <p className="text-white/50 text-[15px] mt-2 font-medium">
            Hedge your portfolio with prediction markets
          </p>
        </motion.div>

        <motion.div
          className="p-7 space-y-4 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="text-center mb-2">
            <h2 className="text-white text-lg font-bold">Get Started</h2>
            <p className="text-white/40 text-sm mt-1">Import your portfolio to begin hedging</p>
          </div>

          {/* Connect Gmail — primary */}
          <motion.button
            onClick={handleGmailConnect}
            disabled={loading}
            className="w-full font-semibold py-3.5 rounded-xl text-[15px] disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2.5 text-white"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              boxShadow: '0 4px 0 0 #1D4ED8, 0 4px 20px rgba(59,130,246,0.3)',
            }}
            whileHover={{ y: 2, boxShadow: '0 2px 0 0 #1D4ED8, 0 2px 10px rgba(59,130,246,0.2)' }}
            whileTap={{ y: 4, boxShadow: '0 0 0 0 #1D4ED8' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Scanning emails...
              </>
            ) : (
              <>
                <Mail size={16} /> Connect Gmail <ArrowRight size={14} />
              </>
            )}
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Import CSV — secondary */}
          <motion.button
            onClick={() => navigate('/import')}
            className="w-full font-semibold py-3.5 rounded-xl text-[15px] cursor-pointer flex items-center justify-center gap-2.5 text-white/70 hover:text-white transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload size={16} /> Import CSV / Manual Entry
          </motion.button>

          {error && (
            <motion.div
              className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2.5"
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <p className="text-red-400 text-[13px] font-medium">{error}</p>
            </motion.div>
          )}

          <p className="text-white/20 text-[11px] text-center pt-1">
            We only read your Robinhood emails. Nothing is stored.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Add Google type declaration**

Add this to the top of the file (after imports) or create a `frontend/src/google.d.ts` file:

```ts
// frontend/src/google.d.ts
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string
            scope: string
            ux_mode: string
            redirect_uri: string
            callback: (response: { code?: string; error?: string }) => void
          }) => { requestCode: () => void }
        }
      }
    }
  }
}
export {}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LandingPage.tsx frontend/src/google.d.ts
git commit -m "feat: add LandingPage with Connect Gmail and CSV import options"
```

---

### Task 9: Create GmailPreviewPage

**Files:**
- Create: `frontend/src/pages/GmailPreviewPage.tsx`

- [ ] **Step 1: Create the preview page component**

```tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trash2, Check, ArrowLeft, Mail } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Position } from '../types'

export default function GmailPreviewPage() {
  const navigate = useNavigate()
  const gmailPositions = useStore((s) => s.gmailPreviewPositions)
  const setPositions = useStore((s) => s.setPositions)
  const setLoggedIn = useStore((s) => s.setLoggedIn)
  const clearGmailPreview = useStore((s) => s.clearGmailPreview)

  const [selected, setSelected] = useState<Set<string>>(() => new Set(gmailPositions.map((p) => p.ticker)))

  if (gmailPositions.length === 0) {
    navigate('/')
    return null
  }

  const toggleTicker = (ticker: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) next.delete(ticker)
      else next.add(ticker)
      return next
    })
  }

  const handleConfirm = () => {
    const confirmed = gmailPositions.filter((p) => selected.has(p.ticker))
    if (confirmed.length === 0) return
    setPositions(confirmed)
    setLoggedIn(true)
    clearGmailPreview()
  }

  const totalValue = gmailPositions
    .filter((p) => selected.has(p.ticker))
    .reduce((s, p) => s + (p.marketValue || 0), 0)

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-[540px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
            <Mail size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Positions Found</h1>
          <p className="text-text-secondary text-sm mt-1">
            We found {gmailPositions.length} positions from your Robinhood emails
          </p>
        </div>

        <div className="card-static overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_0.7fr_0.7fr_0.7fr] gap-2 px-5 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-border bg-bg-page">
            <span></span>
            <span>Ticker</span>
            <span className="text-right">Shares</span>
            <span className="text-right">Avg Cost</span>
            <span className="text-right">Value</span>
          </div>

          {/* Position rows */}
          <div className="max-h-[400px] overflow-y-auto">
            {gmailPositions.map((pos) => {
              const isSelected = selected.has(pos.ticker)
              return (
                <motion.div
                  key={pos.ticker}
                  className={`grid grid-cols-[2rem_1fr_0.7fr_0.7fr_0.7fr] gap-2 px-5 py-3 items-center border-b border-border/50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-white' : 'bg-bg-page opacity-50'
                  }`}
                  onClick={() => toggleTicker(pos.ticker)}
                  whileTap={{ scale: 0.99 }}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-blue border-blue' : 'border-border'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{pos.ticker}</p>
                    <p className="text-[11px] text-text-muted truncate">{pos.name}</p>
                  </div>
                  <p className="text-sm text-text-primary text-right font-medium">{pos.shares}</p>
                  <p className="text-sm text-text-primary text-right font-medium">
                    {pos.avgCost > 0 ? `$${pos.avgCost.toFixed(2)}` : '—'}
                  </p>
                  <p className="text-sm text-text-primary text-right font-medium">
                    {pos.marketValue > 0 ? `$${pos.marketValue.toLocaleString()}` : '—'}
                  </p>
                </motion.div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-bg-page border-t border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">{selected.size} of {gmailPositions.length} selected</p>
              {totalValue > 0 && (
                <p className="text-sm font-bold text-text-primary">${totalValue.toLocaleString()}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { clearGmailPreview(); navigate('/') }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary bg-transparent border border-border cursor-pointer transition-colors"
              >
                <ArrowLeft size={14} className="inline mr-1" /> Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue hover:bg-blue/90 border-none cursor-pointer disabled:opacity-30 transition-colors"
              >
                Import {selected.size} Positions
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/GmailPreviewPage.tsx
git commit -m "feat: add GmailPreviewPage for confirming imported positions"
```

---

### Task 10: Add Gmail preview state to Zustand store

**Files:**
- Modify: `frontend/src/store/useStore.ts`

- [ ] **Step 1: Add gmailPreviewPositions state and actions**

Add to the `AppState` interface (after `analysisError: string | null`):

```ts
gmailPreviewPositions: Position[]
setGmailPreviewPositions: (p: Position[]) => void
clearGmailPreview: () => void
```

Add to the store initializer (after the `setAnalysisError` action):

```ts
gmailPreviewPositions: [],
setGmailPreviewPositions: (p) => set({ gmailPreviewPositions: p }),
clearGmailPreview: () => set({ gmailPreviewPositions: [] }),
```

Do NOT add `gmailPreviewPositions` to the `partialize` persist config — it's temporary state that shouldn't survive page reloads.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/useStore.ts
git commit -m "feat: add gmailPreviewPositions state to Zustand store"
```

---

### Task 11: Update App.tsx routing

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx` (if needed for BrowserRouter)

- [ ] **Step 1: Check if react-router-dom is installed**

```bash
ls /Users/louisyu/PolyHedge/frontend/node_modules/react-router-dom/package.json
```

It's already in `package.json` dependencies.

- [ ] **Step 2: Update main.tsx to wrap app in BrowserRouter**

Read `frontend/src/main.tsx` first. Then wrap `<App />` in `<BrowserRouter>`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: Update App.tsx with routes**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import LandingPage from './pages/LandingPage'
import ImportPage from './pages/ImportPage'
import GmailPreviewPage from './pages/GmailPreviewPage'
import Dashboard from './pages/Dashboard'

function App() {
  const isLoggedIn = useStore((s) => s.isLoggedIn)

  if (isLoggedIn) {
    return (
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/gmail-preview" element={<GmailPreviewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 4: Verify the app compiles**

Check the Vite dev server terminal for errors. Load `http://localhost:5173` in the browser — should see the new LandingPage.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: add routing with LandingPage, ImportPage, GmailPreviewPage, Dashboard"
```

---

### Task 12: End-to-end test

- [ ] **Step 1: Restart the backend**

```bash
lsof -ti:4000 | xargs kill 2>/dev/null; sleep 1; cd /Users/louisyu/PolyHedge/service-data && npm start &
```

- [ ] **Step 2: Verify frontend loads**

Open `http://localhost:5173` — should see LandingPage with "Connect Gmail" and "Import CSV/Manual" buttons.

- [ ] **Step 3: Test CSV import flow still works**

Click "Import CSV / Manual Entry" → should navigate to ImportPage. Import a CSV or add manual positions → should go to dashboard.

- [ ] **Step 4: Test Gmail connect flow**

Click "Connect Gmail" → Google OAuth popup should appear. Sign in and grant access → should scan emails, show preview page, confirm → dashboard.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: end-to-end integration fixes for Gmail import"
```
