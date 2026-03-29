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
    const tokens = await exchangeCode(code, redirectUri || "http://localhost:5173");
    const accessToken = tokens.access_token;

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

    // Debug: log email subjects and body snippets
    for (const email of emails) {
      console.log(`[/auth/google] Subject: "${email.subject}"`);
      if (email.subject.includes("executed") || email.subject.includes("confirmation")) {
        console.log(`[/auth/google] TRADE EMAIL BODY FULL LENGTH: ${email.body.length}`);
        // Log chunks to see full content
        for (let i = 0; i < Math.min(email.body.length, 10000); i += 2000) {
          console.log(`[/auth/google] CHUNK ${i}: "${email.body.substring(i, i + 2000)}"`);
        }
      } else {
        console.log(`[/auth/google] Body snippet: "${email.body.substring(0, 300)}"`);
      }
      console.log("---");
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
