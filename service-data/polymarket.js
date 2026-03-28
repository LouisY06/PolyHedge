const axios = require("axios");

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_BASE_URL = "https://polymarket.com/event";

const API_KEY = process.env.POLYMARKET_API_KEY;
const API_SECRET = process.env.POLYMARKET_SECRET;
const API_PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;

/**
 * Search Polymarket for active markets matching a keyword.
 * Uses the public Gamma API — no auth required.
 *
 * The Gamma API does not support server-side text search, so we fetch
 * a batch of high-volume active markets and filter client-side.
 */
async function searchMarketsByKeyword(keyword, { limit = 10 } = {}) {
  const url = `${GAMMA_API_BASE}/markets`;
  const FETCH_BATCH = 200;

  const headers = {};
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
    headers["X-API-Key"] = API_KEY;
    headers["X-API-Secret"] = API_SECRET;
    headers["X-API-Passphrase"] = API_PASSPHRASE;
  }

  const response = await axios.get(url, {
    headers,
    params: {
      closed: false,
      active: true,
      limit: FETCH_BATCH,
      order: "volumeNum",
      ascending: false,
    },
    timeout: 10000,
  });

  const markets = response.data;

  if (!Array.isArray(markets)) {
    return [];
  }

  const lowerKeyword = keyword.toLowerCase();

  return markets
    .filter((m) => {
      const text = `${m.question || ""} ${m.groupItemTitle || ""}`.toLowerCase();
      return text.includes(lowerKeyword);
    })
    .slice(0, limit)
    .map(normalizeMarket)
    .filter(Boolean);
}

function normalizeMarket(raw) {
  if (!raw || !raw.id) return null;

  const probability = parseProbability(raw);

  return {
    id: raw.id,
    title: raw.question || raw.title || "Untitled",
    slug: raw.slug || null,
    probability,
    volume: parseFloat(raw.volume) || 0,
    endDate: raw.endDate || raw.end_date_iso || null,
    url: raw.slug ? `${POLYMARKET_BASE_URL}/${raw.slug}` : null,
  };
}

function parseProbability(raw) {
  // outcomePrices is typically a JSON string like "[\"0.85\",\"0.15\"]"
  // where index 0 = "Yes" price = probability
  if (raw.outcomePrices) {
    try {
      const prices = JSON.parse(raw.outcomePrices);
      if (Array.isArray(prices) && prices.length > 0) {
        return Math.round(parseFloat(prices[0]) * 100);
      }
    } catch {
      // fall through
    }
  }

  if (raw.bestBid != null) {
    return Math.round(parseFloat(raw.bestBid) * 100);
  }

  return null;
}

module.exports = { searchMarketsByKeyword };
