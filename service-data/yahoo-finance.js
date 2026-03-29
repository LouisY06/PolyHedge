const axios = require("axios");

const YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * Fetch current quote data for one or more tickers via the v8 chart endpoint.
 * Returns a map of ticker → normalized quote.
 */
async function getQuotes(tickers) {
  if (!tickers || tickers.length === 0) return {};

  const results = await Promise.allSettled(
    tickers.map((t) => fetchQuote(t.toUpperCase()))
  );

  const map = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      map[r.value.ticker] = r.value;
    }
  }
  return map;
}

async function getQuote(ticker) {
  const map = await getQuotes([ticker]);
  return map[ticker.toUpperCase()] || null;
}

async function fetchQuote(ticker) {
  const response = await axios.get(`${YF_CHART}/${ticker}`, {
    params: { interval: "1d", range: "5d" },
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    timeout: 10000,
  });

  const result = response.data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  return {
    ticker: meta.symbol,
    name: meta.shortName || meta.longName || meta.symbol,
    currentPrice: meta.regularMarketPrice ?? null,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
    changePercent:
      meta.regularMarketPrice && meta.chartPreviousClose
        ? Math.round(((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 10000) / 100
        : null,
    volume: meta.regularMarketVolume ?? null,
    marketCap: null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    currency: meta.currency || "USD",
  };
}

async function getChart(ticker, { range = "5d", interval = "15m" } = {}) {
  const response = await axios.get(`${YF_CHART}/${ticker.toUpperCase()}`, {
    params: { interval, range },
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    timeout: 10000,
  });

  const result = response.data?.chart?.result?.[0];
  if (!result) return null;

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const points = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) {
      points.push({ time: timestamps[i] * 1000, price: Math.round(closes[i] * 100) / 100 });
    }
  }

  return { ticker: result.meta.symbol, previousClose: result.meta.chartPreviousClose ?? null, points };
}

/**
 * Fetch company profile (sector, industry, description) via quoteSummary.
 * Returns { sector, industry, description } or null.
 */
async function getCompanyProfile(ticker) {
  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker.toUpperCase()}`,
      {
        params: { modules: "assetProfile,summaryProfile" },
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        timeout: 10000,
      }
    );

    const profile =
      response.data?.quoteSummary?.result?.[0]?.assetProfile ||
      response.data?.quoteSummary?.result?.[0]?.summaryProfile;

    if (!profile) return null;

    return {
      sector: profile.sector || null,
      industry: profile.industry || null,
      description: profile.longBusinessSummary || null,
    };
  } catch {
    return null;
  }
}

module.exports = { getQuotes, getQuote, getChart, getCompanyProfile };
