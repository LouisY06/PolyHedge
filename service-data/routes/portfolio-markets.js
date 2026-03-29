const { searchMarketsByKeyword, scoreMarketRelevance } = require("../polymarket");
const { resolveKeywordsForHolding } = require("../ticker-keywords");

const MARKETS_PER_HOLDING = 5;

// ── Input validation ─────────────────────────────────────

/**
 * Normalize and validate an array of raw holdings.
 * Skips entries that are missing a ticker.
 */
function normalizeHoldings(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((h) => {
      if (!h || !h.ticker) return null;
      return {
        ticker: String(h.ticker).trim().toUpperCase(),
        companyName: h.companyName ? String(h.companyName).trim() : null,
        weight: parseWeight(h.weight),
      };
    })
    .filter(Boolean);
}

function parseWeight(val) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ── Per-holding market discovery ─────────────────────────

/**
 * For a single holding, search Polymarket across all relevant keywords,
 * collect candidates, dedupe, rank, and return the top results.
 */
async function getMarketsForHolding(holding) {
  const keywords = await resolveKeywordsForHolding(holding);

  // Search each keyword in parallel, collect all candidates with their matched keyword
  const searchResults = await Promise.allSettled(
    keywords.map(async (kw) => {
      // Fetch more than we need so ranking has a pool to work with
      const markets = await searchMarketsByKeyword(kw, { limit: 10 });
      return markets.map((m) => ({ market: m, keyword: kw }));
    })
  );

  // Flatten fulfilled results
  const candidates = searchResults
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  if (candidates.length === 0) return [];

  const deduped = dedupeMarkets(candidates);
  return rankMarketsForHolding(deduped, holding, keywords);
}

/**
 * Remove duplicate markets (same id), keeping the entry
 * whose keyword matched first (i.e. higher priority keyword).
 */
function dedupeMarkets(candidates) {
  const seen = new Map();
  for (const entry of candidates) {
    if (!seen.has(entry.market.id)) {
      seen.set(entry.market.id, entry);
    }
  }
  return Array.from(seen.values());
}

/**
 * Rank candidate markets for a holding and return the top N.
 *
 * Scoring:
 *   - keyword position bonus:  keywords earlier in the list are more specific
 *   - title relevance:         exact word match > substring match
 *   - volume/liquidity:        tiebreaker via log-scale
 *
 * Returns scored suggestion objects ready for the response.
 */
function rankMarketsForHolding(candidates, holding, keywords) {
  const scored = candidates.map((entry) => {
    const { market, keyword } = entry;
    let score = 0;

    const title = market.title.toLowerCase();
    const kw = keyword.toLowerCase();

    // Keyword position bonus: first keyword = 10pts, decays for later ones
    const kwIndex = keywords.indexOf(keyword);
    score += Math.max(0, 10 - kwIndex);

    // Title match quality
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(title)) {
      score += 20; // whole word match
    } else if (title.includes(kw)) {
      score += 10; // substring match
    }

    // Volume tiebreaker (0–5)
    if (market.volume > 0) {
      score += Math.min(5, Math.log10(market.volume));
    }

    // Liquidity tiebreaker (0–3)
    if (market.liquidity > 0) {
      score += Math.min(3, Math.log10(market.liquidity) / 2);
    }

    // Active bonus
    if (market.isActive && !market.isClosed) {
      score += 2;
    }

    // Penalize likely-irrelevant sports/entertainment matches
    // when the keyword was a geopolitical or sector term
    if (looksLikeSportsMarket(title) && !isSportsKeyword(kw)) {
      score -= 15;
    }

    return {
      ticker: holding.ticker,
      companyName: holding.companyName,
      portfolioWeight: holding.weight,
      keywordMatched: keyword,
      relevanceScore: roundTo(score / 50, 2), // normalize to ~0–1 range
      market,
    };
  });

  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MARKETS_PER_HOLDING);
}

const SPORTS_PATTERNS = /\b(nba|nfl|nhl|mlb|fifa|world cup|finals|playoff|premier league|champions league|win the 202\d|bout|fight|ufc|boxing)\b/i;

function looksLikeSportsMarket(title) {
  return SPORTS_PATTERNS.test(title);
}

function isSportsKeyword(kw) {
  return SPORTS_PATTERNS.test(kw);
}

function roundTo(n, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ── Route handler ────────────────────────────────────────

/**
 * POST /portfolio-markets
 *
 * Accepts a list of portfolio holdings and returns ranked
 * Polymarket suggestions for each one.
 */
async function handler(req, res) {
  const raw = req.body?.holdings;

  if (!Array.isArray(raw) || raw.length === 0) {
    return res
      .status(400)
      .json({ error: "Body must be { holdings: [...] } with at least one entry" });
  }

  const holdings = normalizeHoldings(raw);

  if (holdings.length === 0) {
    return res
      .status(400)
      .json({ error: "No valid holdings found. Each entry needs at least a ticker." });
  }

  try {
    // Process all holdings in parallel
    const results = await Promise.allSettled(
      holdings.map(async (h) => {
        const suggestions = await getMarketsForHolding(h);
        return suggestions;
      })
    );

    const marketSuggestions = results
      .map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        console.error(
          `[/portfolio-markets] Failed for ${holdings[i].ticker}:`,
          r.reason?.message
        );
        return [];
      })
      .flat();

    return res.json({
      holdings,
      marketSuggestions,
    });
  } catch (err) {
    console.error("[/portfolio-markets] Unexpected error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  handler,
  normalizeHoldings,
  getMarketsForHolding,
  dedupeMarkets,
  rankMarketsForHolding,
};
