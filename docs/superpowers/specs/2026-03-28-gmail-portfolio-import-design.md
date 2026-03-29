# Gmail Portfolio Import — Design Spec

## Summary

Replace the fake Robinhood login with a Gmail-based portfolio import. Users connect their Gmail account, the app scans all Robinhood trade confirmation emails, computes net positions, and presents them for confirmation before importing to the dashboard. CSV/manual import remains as a secondary option.

## User Flow

1. User lands on a new landing page with two options: **"Connect Gmail"** (primary) and **"Import CSV/Manual"** (secondary)
2. "Connect Gmail" opens a Google OAuth popup requesting `gmail.readonly` scope
3. Google returns an authorization code to the frontend callback
4. Frontend sends the code to `POST /auth/google` on the backend
5. Backend exchanges the code for an access token, scans all Robinhood emails, parses trades, computes net positions, enriches with Yahoo Finance, and returns positions
6. Frontend shows a preview table of detected positions (ticker, shares, avg cost, current price)
7. User can remove any positions they don't want
8. User clicks "Confirm" to import — positions go to the dashboard
9. Access token is discarded after the scan — nothing stored

## Backend

### New endpoint: `POST /auth/google`

**Request body:**
```json
{ "code": "<google-authorization-code>" }
```

**Response:**
```json
{
  "positions": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc",
      "shares": 10,
      "averageCost": 175.50,
      "currentPrice": 182.30,
      "marketValue": 1823.00,
      "gainLoss": 68.00,
      "gainLossPercent": 3.87
    }
  ]
}
```

Same shape as `/positions/manual` and `/positions/upload` responses, so the frontend handles all three identically.

### New files

- `service-data/gmail.js` — Gmail API client
  - `exchangeCode(code)` — exchanges auth code for access token using client secret
  - `fetchRobinhoodEmails(accessToken)` — searches Gmail for `from:robinhood.com`, fetches all matching emails, returns raw message bodies
  - `parseTradeEmails(emails)` — extracts buy/sell trades from email content (ticker, shares, price, date, action)
  - `computeNetPositions(trades)` — aggregates trades per ticker, returns net positions (shares > 0 only)

- `service-data/routes/auth-google.js` — endpoint handler
  - Receives code, calls gmail.js functions, enriches with `getQuotes()`, returns positions

### New dependency

- `googleapis` npm package

### Environment variables (in `service-data/.env`)

```
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
```

## Frontend

### Replace LoginPage with LandingPage

- Primary CTA: "Connect Gmail" — triggers Google OAuth
- Secondary CTA: "Import CSV/Manual" — navigates to existing ImportPage
- Clean, simple layout

### Google OAuth in frontend

- Load Google Identity Services library via script tag
- On "Connect Gmail" click, initiate OAuth code flow with:
  - `client_id` from env/config
  - `scope: gmail.readonly`
  - `redirect_uri: http://localhost:5173/auth/google/callback`
- Callback route receives the code, sends to backend

### New preview step: GmailPreviewPage

- Shows table of detected positions from Gmail scan
- Columns: ticker, shares, avg cost, current price, market value
- Each row has a remove button
- "Confirm Import" button saves positions to store and navigates to dashboard
- "Back" button returns to landing page

### Route changes

- `/` — LandingPage (replaces LoginPage)
- `/auth/google/callback` — handles OAuth redirect, calls backend, navigates to preview
- `/gmail-preview` — GmailPreviewPage
- `/import` — existing ImportPage (unchanged)
- `/dashboard` — existing Dashboard (unchanged)

## Email Parsing Strategy

- Search query: `from:robinhood.com` (no date limit, get all)
- Look for trade confirmation emails (subject patterns like "Your order has been executed", "Your market order...", etc.)
- Extract from email body: action (buy/sell), ticker, shares, price per share
- Use regex patterns matched against Robinhood's email HTML format
- If an email can't be parsed, skip it silently

## What stays the same

- Dashboard, analysis, charts, hedge builder — all unchanged
- ImportPage (CSV upload + manual entry) — unchanged, just accessed differently
- All existing backend endpoints — unchanged
- Position data shape — identical across all import methods

## Scope exclusions

- No token storage or user accounts
- No periodic sync — one-time scan only
- No Outlook/other email providers
- No database
