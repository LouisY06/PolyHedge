const axios = require("axios");

const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YF_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";

/**
 * Fetch current quote data for one or more tickers from Yahoo Finance.
 * Returns a map of ticker → quote fields.
 */
async function getQuotes(tickers) {
  if (!tickers || tickers.length === 0) return {};

  // Yahoo Finance v7 quote endpoint accepts comma-separated symbols
  const symbols = tickers.map((t) => t.toUpperCase()).join(",");

  const response = await axios.get(YF_QUOTE_BASE, {
    params: {
      symbols,
      fields: [
        "symbol",
        "shortName",
        "regularMarketPrice",
        "regularMarketPreviousClose",
        "regularMarketChangePercent",
        "regularMarketVolume",
        "marketCap",
        "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow",
        "currency",
      ].join(","),
    },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    timeout: 10000,
  });

  const results = response.data?.quoteResponse?.result;
  if (!Array.isArray(results)) return {};

  const map = {};
  for (const q of results) {
    if (!q.symbol) continue;
    map[q.symbol.toUpperCase()] = normalizeQuote(q);
  }
  return map;
}

/**
 * Fetch quote for a single ticker. Returns null if not found.
 */
async function getQuote(ticker) {
  const map = await getQuotes([ticker]);
  return map[ticker.toUpperCase()] || null;
}

function normalizeQuote(raw) {
  return {
    ticker: raw.symbol,
    name: raw.shortName || raw.symbol,
    currentPrice: raw.regularMarketPrice ?? null,
    previousClose: raw.regularMarketPreviousClose ?? null,
    changePercent: raw.regularMarketChangePercent != null
      ? Math.round(raw.regularMarketChangePercent * 100) / 100
      : null,
    volume: raw.regularMarketVolume ?? null,
    marketCap: raw.marketCap ?? null,
    fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: raw.fiftyTwoWeekLow ?? null,
    currency: raw.currency || "USD",
  };
}

module.exports = { getQuotes, getQuote };
