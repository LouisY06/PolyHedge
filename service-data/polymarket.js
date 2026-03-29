const axios = require("axios");

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_BASE_URL = "https://polymarket.com/event";
const DEFAULT_RESULT_LIMIT = 5;
const FETCH_BATCH = 500;
const MIN_RELEVANCE_SCORE = 5;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const API_KEY = process.env.POLYMARKET_API_KEY;
const API_SECRET = process.env.POLYMARKET_SECRET;
const API_PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;

// ── In-memory market cache ─────────────────────────────────

let _cache = { markets: [], fetchedAt: 0 };

/**
 * Fetch and cache active markets from the Gamma API.
 * Returns the cached array if it's still fresh.
 */
async function fetchMarketBatch() {
  if (_cache.markets.length > 0 && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.markets;
  }

  const url = `${GAMMA_API_BASE}/markets`;

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
    timeout: 15000,
  });

  const raw = response.data;

  if (!Array.isArray(raw)) {
    return _cache.markets; // return stale cache rather than nothing
  }

  const markets = raw.filter(isActiveOpen);
  _cache = { markets, fetchedAt: Date.now() };
  console.log(`[polymarket] Cached ${markets.length} active markets`);
  return markets;
}

/**
 * Search cached markets for a keyword.
 * Fetches a fresh batch if the cache is stale.
 */
async function searchMarketsByKeyword(keyword, { limit = DEFAULT_RESULT_LIMIT } = {}) {
  const candidates = await fetchMarketBatch();
  return selectTopMarkets(candidates, keyword, limit);
}

/**
 * Return all cached markets (normalized), optionally filtered by a search query.
 * Used by the /markets/browse endpoint.
 */
async function browseMarkets({ query, limit = 100 } = {}) {
  const candidates = await fetchMarketBatch();

  if (!query || !query.trim()) {
    // No query → return top markets by volume (already sorted)
    return candidates.slice(0, limit).map(normalizeMarket).filter(Boolean);
  }

  // Text search across question, slug, and description
  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = candidates
    .map((m) => {
      const text = [
        m.question || m.title || "",
        m.slug || "",
        m.description || "",
      ].join(" ").toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (matchesWholeWord(text, term)) score += 10;
        else if (text.includes(term)) score += 4;
      }
      return { raw: m, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((e) => normalizeMarket(e.raw)).filter(Boolean);
}

// ── Relevance ranking ────────────────────────────────────

/**
 * Score, rank, filter, and return the top N markets for a keyword.
 */
function selectTopMarkets(markets, keyword, limit) {
  const scored = markets
    .map((m) => ({ raw: m, score: scoreMarketRelevance(m, keyword) }))
    .filter((entry) => entry.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((entry) => normalizeMarket(entry.raw)).filter(Boolean);
}

/**
 * Deterministic relevance score for a market against a keyword.
 *
 * Scoring breakdown:
 *   Title exact match (whole word)        +40
 *   Slug exact match (whole segment)      +30
 *   Title partial/substring match         +15
 *   Slug partial/substring match          +10
 *   Description match (whole word)        +12
 *   Description partial match             +5
 *   Volume tiebreaker                     +0 to +5  (log-scaled)
 *   Liquidity bonus                       +0 to +3  (log-scaled)
 *   Has end date in the future            +2
 */
function scoreMarketRelevance(raw, keyword) {
  const kw = keyword.toLowerCase();
  const title = (raw.question || raw.title || "").toLowerCase();
  const slug = (raw.slug || "").toLowerCase();
  const desc = (raw.description || "").toLowerCase();

  let score = 0;

  // ── Text relevance ──
  const titleHasWord = matchesWholeWord(title, kw);
  const slugHasSegment = matchesSlugSegment(slug, kw);
  const titleHasSubstring = !titleHasWord && title.includes(kw);
  const slugHasSubstring = !slugHasSegment && slug.includes(kw);

  if (titleHasWord) score += 40;
  else if (titleHasSubstring && kw.length >= 3) score += 15;

  if (slugHasSegment) score += 30;
  else if (slugHasSubstring && kw.length >= 3) score += 10;

  // Description matching (weaker signal but catches more results)
  if (score === 0) {
    if (matchesWholeWord(desc, kw)) score += 12;
    else if (desc.includes(kw) && kw.length >= 3) score += 5;
  }

  // No text match at all → irrelevant
  if (score === 0) return 0;

  // ── Tiebreakers ──
  const vol = safeNumber(raw.volumeNum ?? raw.volume, 0);
  if (vol > 0) score += Math.min(5, Math.log10(vol));

  const liq = safeNumber(raw.liquidityNum ?? raw.liquidity, 0);
  if (liq > 0) score += Math.min(3, Math.log10(liq) / 2);

  if (hasFutureEndDate(raw)) score += 2;

  return score;
}

/**
 * Check if `keyword` appears as a whole word in `text`.
 */
function matchesWholeWord(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/**
 * Check if `keyword` appears as a complete slug segment.
 */
function matchesSlugSegment(slug, keyword) {
  const segments = slug.split("-");
  return segments.includes(keyword);
}

function hasFutureEndDate(raw) {
  const dateStr = raw.endDate || raw.endDateIso;
  if (!dateStr) return false;
  return new Date(dateStr) > new Date();
}

// ── Filtering ────────────────────────────────────────────

function isActiveOpen(raw) {
  return raw.active === true && raw.closed === false;
}

// ── Normalization ────────────────────────────────────────

/**
 * Normalize a raw Gamma API market object into a stable shape.
 */
function normalizeMarket(raw) {
  if (!raw || !raw.id) return null;

  const outcomes = parseOutcomes(raw);
  const probability = parseProbability(raw);

  const eventSlug = raw.events?.[0]?.slug || raw.slug || null;

  return {
    id: String(raw.id),
    title: raw.question || raw.title || "Untitled",
    slug: raw.slug || null,
    probability,
    volume: safeNumber(raw.volumeNum ?? raw.volume, 0),
    liquidity: safeNumber(raw.liquidityNum ?? raw.liquidity, 0),
    endDate: raw.endDate || raw.endDateIso || null,
    image: raw.image || raw.icon || null,
    url: eventSlug ? `${POLYMARKET_BASE_URL}/${eventSlug}` : null,
    outcomes,
    isActive: raw.active === true,
    isClosed: raw.closed === true,
  };
}

function parseOutcomes(raw) {
  const labels = safeArray(raw.outcomes);
  const prices = safeArray(raw.outcomePrices);

  if (labels.length === 0) return [];

  return labels.map((label, i) => {
    const priceRaw = i < prices.length ? prices[i] : null;
    const price = priceRaw != null ? safeNumber(priceRaw, null) : null;
    return {
      label: String(label),
      probability: price != null ? Math.round(price * 100) : null,
    };
  });
}

function parseProbability(raw) {
  const prices = safeArray(raw.outcomePrices);
  if (prices.length > 0) {
    const val = safeNumber(prices[0], null);
    if (val != null) return Math.round(val * 100);
  }

  if (raw.lastTradePrice != null) {
    const val = safeNumber(raw.lastTradePrice, null);
    if (val != null) return Math.round(val * 100);
  }

  if (raw.bestBid != null) {
    const val = safeNumber(raw.bestBid, null);
    if (val != null) return Math.round(val * 100);
  }

  return null;
}

// ── Helpers ──────────────────────────────────────────────

function safeNumber(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not valid JSON
    }
  }
  return [];
}

module.exports = {
  searchMarketsByKeyword,
  scoreMarketRelevance,
  selectTopMarkets,
  browseMarkets,
  fetchMarketBatch,
};
