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
      q: "from:robinhood.com",
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
 * Matches three common Robinhood email formats.
 *
 * @param {Array<{subject: string, body: string}>} emails
 * @returns {Array<{action: "buy"|"sell", ticker: string, shares: number, price: number}>}
 */
function parseTradeEmails(emails) {
  const trades = [];

  // Pattern 1: "You bought 10 shares of AAPL at $175.50"
  const pattern1 = /you\s+(bought|sold)\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+([A-Z]{1,5})\s+at\s+\$([0-9,]+(?:\.\d+)?)/gi;

  // Pattern 2: "order to buy 3 shares of MSFT was executed at $415.20"
  const pattern2 = /order\s+to\s+(buy|sell)\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+([A-Z]{1,5})\s+was\s+executed\s+at\s+\$([0-9,]+(?:\.\d+)?)/gi;

  // Pattern 3: "your 10 shares of AAPL were/was bought/sold at $175.50"
  const pattern3 = /your\s+([\d,]+(?:\.\d+)?)\s+shares?\s+of\s+([A-Z]{1,5})\s+(?:were|was)\s+(bought|sold)\s+at\s+\$([0-9,]+(?:\.\d+)?)/gi;

  for (const email of emails) {
    const text = `${email.subject}\n${email.body}`;

    // Reset lastIndex since patterns have /g flag
    pattern1.lastIndex = 0;
    pattern2.lastIndex = 0;
    pattern3.lastIndex = 0;

    let match;

    while ((match = pattern1.exec(text)) !== null) {
      const action = match[1].toLowerCase() === "bought" ? "buy" : "sell";
      const shares = parseFloat(match[2].replace(/,/g, ""));
      const ticker = match[3].toUpperCase();
      const price = parseFloat(match[4].replace(/,/g, ""));
      if (shares > 0 && price > 0 && ticker.length <= 5) {
        trades.push({ action, ticker, shares, price });
      }
    }

    while ((match = pattern2.exec(text)) !== null) {
      const action = match[1].toLowerCase() === "buy" ? "buy" : "sell";
      const shares = parseFloat(match[2].replace(/,/g, ""));
      const ticker = match[3].toUpperCase();
      const price = parseFloat(match[4].replace(/,/g, ""));
      if (shares > 0 && price > 0 && ticker.length <= 5) {
        trades.push({ action, ticker, shares, price });
      }
    }

    while ((match = pattern3.exec(text)) !== null) {
      const shares = parseFloat(match[1].replace(/,/g, ""));
      const ticker = match[2].toUpperCase();
      const action = match[3].toLowerCase() === "bought" ? "buy" : "sell";
      const price = parseFloat(match[4].replace(/,/g, ""));
      if (shares > 0 && price > 0 && ticker.length <= 5) {
        trades.push({ action, ticker, shares, price });
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
