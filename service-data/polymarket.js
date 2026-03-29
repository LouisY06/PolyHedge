const axios = require("axios");

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_BASE_URL = "https://polymarket.com/event";
const DEFAULT_RESULT_LIMIT = 2;
const FETCH_BATCH = 200;
const MIN_RELEVANCE_SCORE = 5;

const API_KEY = process.env.POLYMARKET_API_KEY;
const API_SECRET = process.env.POLYMARKET_SECRET;
const API_PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;

/**
 * Search Polymarket for active/open markets matching a keyword.
 *
 * The Gamma API does not support server-side text search, so we fetch
 * a batch of high-volume active markets, score them for relevance,
 * and return the top results.
 *
 * Returns a normalized array — every item has the same shape.
 */
async function searchMarketsByKeyword(keyword, { limit = DEFAULT_RESULT_LIMIT } = {}) {
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
    timeout: 10000,
  });

  const raw = response.data;

  if (!Array.isArray(raw)) {
    return [];
  }

  const candidates = raw.filter(isActiveOpen);
  return selectTopMarkets(candidates, keyword, limit);
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
 *   Volume tiebreaker                     +0 to +5  (log-scaled)
 *   Liquidity bonus                       +0 to +3  (log-scaled)
 *   Has end date in the future            +2
 *
 * A market that doesn't match title OR slug at all scores 0
 * and gets filtered out by the MIN_RELEVANCE_SCORE threshold.
 */
function scoreMarketRelevance(raw, keyword) {
  const kw = keyword.toLowerCase();
  const title = (raw.question || raw.title || "").toLowerCase();
  const slug = (raw.slug || "").toLowerCase();

  let score = 0;

  // ── Text relevance ──
  const titleHasWord = matchesWholeWord(title, kw);
  const slugHasSegment = matchesSlugSegment(slug, kw);
  const titleHasSubstring = !titleHasWord && title.includes(kw);
  const slugHasSubstring = !slugHasSegment && slug.includes(kw);

  if (titleHasWord) score += 40;
  else if (titleHasSubstring && kw.length >= 4) score += 15;

  if (slugHasSegment) score += 30;
  else if (slugHasSubstring && kw.length >= 4) score += 10;

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
 * E.g. "trump" matches "Will Trump win?" but not "trumpets".
 */
function matchesWholeWord(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

/**
 * Check if `keyword` appears as a complete slug segment.
 * Slug segments are separated by hyphens.
 * E.g. "trump" matches "will-trump-win" but not "trumpets-sound".
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

/**
 * Double-check a market is active and not closed, even though we
 * request active-only from the API. Defensive against stale data.
 */
function isActiveOpen(raw) {
  return raw.active === true && raw.closed === false;
}

// ── Normalization ────────────────────────────────────────

/**
 * Normalize a raw Gamma API market object into a stable shape
 * that frontend devs can rely on.
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
    url: eventSlug ? `${POLYMARKET_BASE_URL}/${eventSlug}` : null,
    outcomes,
    isActive: raw.active === true,
    isClosed: raw.closed === true,
  };
}

/**
 * Parse outcome labels and their prices into a clean array.
 */
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

/**
 * Extract the primary probability (0–100) for the market.
 *
 * Priority:
 *   1. outcomePrices[0] — the "Yes" price, most reliable
 *   2. lastTradePrice  — last executed trade
 *   3. bestBid         — current best bid
 *   4. null            — cannot determine
 */
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

module.exports = { searchMarketsByKeyword, scoreMarketRelevance, selectTopMarkets };
