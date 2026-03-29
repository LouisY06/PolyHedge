const { google } = require("googleapis");

/**
 * Exchange an OAuth2 authorization code for tokens.
 * Reads GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from process.env.
 *
 * @param {string} code - The authorization code from the OAuth2 redirect.
 * @param {string} redirectUri - The redirect URI used in the original auth request.
 * @returns {Promise<object>} Token response (includes access_token, refresh_token, etc.)
 */
async function exchangeCode(code, redirectUri) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Fetch all Robinhood emails from Gmail using the given access token.
 * Paginates through all results matching `from:robinhood.com`.
 *
 * @param {string} accessToken - A valid Gmail-scoped OAuth2 access token.
 * @returns {Promise<Array<{subject: string, body: string}>>}
 */
async function fetchRobinhoodEmails(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  // Collect all message IDs via pagination
  const messageIds = [];
  let pageToken;
  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "from:robinhood.com (order OR trade OR executed OR confirmation)",
      maxResults: 500,
      pageToken,
    });
    const msgs = res.data.messages || [];
    for (const m of msgs) messageIds.push(m.id);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  // Fetch each message in full format
  const emails = [];
  for (const id of messageIds) {
    const res = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    const payload = res.data.payload || {};
    const headers = payload.headers || [];
    const subjectHeader = headers.find((h) => h.name.toLowerCase() === "subject");
    const subject = subjectHeader ? subjectHeader.value : "";
    const body = extractBody(payload);
    emails.push({ subject, body });
  }

  return emails;
}

/**
 * Recursively extract plain text from a Gmail message payload.
 * Prefers text/plain; falls back to text/html.
 * Handles multipart/mixed containing multipart/alternative.
 *
 * @param {object} payload - Gmail message payload object.
 * @returns {string} Decoded text content, or empty string.
 */
function extractBody(payload) {
  if (!payload) return "";

  // Direct body data (non-multipart messages)
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  const parts = payload.parts || [];
  if (parts.length === 0) return "";

  // Look for text/plain first
  const plainPart = parts.find((p) => p.mimeType === "text/plain");
  if (plainPart && plainPart.body && plainPart.body.data) {
    return Buffer.from(plainPart.body.data, "base64url").toString("utf-8");
  }

  // Look for text/html
  const htmlPart = parts.find((p) => p.mimeType === "text/html");
  if (htmlPart && htmlPart.body && htmlPart.body.data) {
    return Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
  }

  // Recurse into nested multipart parts (e.g. multipart/alternative inside multipart/mixed)
  for (const part of parts) {
    const nested = extractBody(part);
    if (nested) return nested;
  }

  return "";
}

/**
 * Parse an array of email objects for Robinhood trade confirmations.
 * Matches real Robinhood email formats including:
 *   - "Your order to buy $50.00 of TSLA ... You paid $50.00 for 0.129454 shares, at an average price of $386.24 per share"
 *   - "You bought 10 shares of AAPL at $175.50"
 *
 * @param {Array<{subject: string, body: string}>} emails
 * @returns {Array<{action: "buy"|"sell", ticker: string, shares: number, price: number}>}
 */
function parseTradeEmails(emails) {
  const trades = [];

  // Pattern 1 (actual Robinhood 2024+ format):
  // "Your order to buy/sell $X of TICKER ... You paid/received $X for Y shares, at an average price of $Z per share"
  const pattern1 = /order\s+to\s+(buy|sell)\s+\$[\d,.]+\s+of\s+([A-Z]{1,5})[\s\S]*?(?:paid|received)\s+\$[\d,.]+\s+for\s+([\d,.]+)\s+shares?,\s+at\s+an\s+average\s+price\s+of\s+\$([\d,.]+)/gi;

  // Pattern 2 (older format): "You bought/sold X shares of TICKER at $PRICE"
  const pattern2 = /you\s+(bought|sold)\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+([A-Z]{1,5})\s+at\s+\$([\d,]+(?:\.\d+)?)/gi;

  // Pattern 3: "order to buy/sell X shares of TICKER was executed at $PRICE"
  const pattern3 = /order\s+to\s+(buy|sell)\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+([A-Z]{1,5})\s+(?:was\s+)?executed\s+at\s+\$([\d,]+(?:\.\d+)?)/gi;

  for (const email of emails) {
    const text = `${email.subject}\n${email.body}`;
    // Strip HTML tags to make regex matching easier
    const cleaned = text.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

    const seen = new Set();

    for (const pattern of [pattern1, pattern2, pattern3]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        let action, ticker, shares, price;

        if (pattern === pattern1) {
          action = match[1].toLowerCase();
          ticker = match[2].toUpperCase();
          shares = parseFloat(match[3].replace(/,/g, ""));
          price = parseFloat(match[4].replace(/,/g, ""));
        } else {
          action = match[1].toLowerCase() === "bought" ? "buy" : match[1].toLowerCase();
          shares = parseFloat(match[2].replace(/,/g, ""));
          ticker = match[3].toUpperCase();
          price = parseFloat(match[4].replace(/,/g, ""));
        }

        if (shares > 0 && price > 0 && ticker.length <= 5) {
          // Deduplicate within same email (Robinhood repeats the text)
          const key = `${action}-${ticker}-${shares}-${price}`;
          if (!seen.has(key)) {
            seen.add(key);
            trades.push({ action, ticker, shares, price });
          }
        }
      }
    }
  }

  return trades;
}

/**
 * Compute net portfolio positions from a list of trades.
 * Buys increase totalShares and totalCost; sells reduce totalShares.
 * Returns positions with net shares > 0.
 *
 * @param {Array<{action: "buy"|"sell", ticker: string, shares: number, price: number}>} trades
 * @returns {Array<{ticker: string, shares: number, averageCost: number}>}
 */
function computeNetPositions(trades) {
  const map = {};

  for (const trade of trades) {
    if (!map[trade.ticker]) {
      map[trade.ticker] = { totalShares: 0, totalCost: 0, buyShares: 0 };
    }
    const pos = map[trade.ticker];
    if (trade.action === "buy") {
      pos.totalShares += trade.shares;
      pos.totalCost += trade.shares * trade.price;
      pos.buyShares += trade.shares;
    } else {
      pos.totalShares -= trade.shares;
    }
  }

  const positions = [];
  for (const [ticker, pos] of Object.entries(map)) {
    const shares = Math.round(pos.totalShares * 1000) / 1000;
    if (shares <= 0) continue;
    const averageCost = pos.buyShares > 0
      ? Math.round((pos.totalCost / pos.buyShares) * 100) / 100
      : 0;
    positions.push({ ticker, shares, averageCost });
  }

  return positions;
}

module.exports = { exchangeCode, fetchRobinhoodEmails, extractBody, parseTradeEmails, computeNetPositions };
