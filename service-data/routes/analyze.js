const { searchMarketsByKeyword } = require("../polymarket");
const { resolveKeywordsForHolding } = require("../ticker-keywords");
const { callK2Think } = require("../../service-ai/k2think");
const {
  buildAnalysisPrompt,
  parseAnalysisResponse,
} = require("../prompts/portfolio-analysis");

const MARKETS_PER_KEYWORD = 3;
const MAX_CANDIDATES = 12;

/**
 * POST /analyze
 *
 * Full pipeline: holdings → keywords → Polymarket search → K2Think analysis → response
 */
async function handler(req, res) {
  const {
    holdings,
    objective = "hedge",
    beginnerMode = true,
    thesis = null,
  } = req.body || {};

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res
      .status(400)
      .json({ error: "Body must include holdings array with at least one entry" });
  }

  // Normalize holdings
  const normalized = holdings
    .filter((h) => h.ticker)
    .map((h) => ({
      ticker: String(h.ticker).trim().toUpperCase(),
      companyName: h.companyName || h.name || h.ticker,
      weight: parseFloat(h.weight) || 0,
    }));

  if (normalized.length === 0) {
    return res.status(400).json({ error: "No valid holdings found" });
  }

  try {
    // ── Step 1: Gather candidate markets from Polymarket ──
    console.log(`[/analyze] Searching Polymarket for ${normalized.length} holdings...`);
    const candidateMarkets = await gatherCandidates(normalized);

    if (candidateMarkets.length === 0) {
      return res.json({
        portfolioThemes: [],
        keywordsByHolding: [],
        selectedMarkets: [],
        portfolioSummary: {
          predictionSleevePct: 0,
          topExposure: null,
          primaryUse: objective,
          abstainReason: "No relevant Polymarket markets found for these holdings",
        },
      });
    }

    console.log(`[/analyze] Found ${candidateMarkets.length} candidate markets, calling K2Think...`);

    // ── Step 2: Send to K2Think for full analysis ──
    const messages = buildAnalysisPrompt(normalized, candidateMarkets, {
      objective,
      beginnerMode,
      thesis,
    });

    const rawResponse = await callK2Think(messages);
    const analysis = parseAnalysisResponse(rawResponse);

    // Attach Polymarket URLs to selected markets
    const urlMap = new Map(candidateMarkets.map((m) => [m.marketId, m.url]));
    if (analysis.selectedMarkets) {
      for (const sm of analysis.selectedMarkets) {
        if (!sm.url && sm.marketId) {
          sm.url = urlMap.get(sm.marketId) || null;
        }
      }
    }

    return res.json(analysis);
  } catch (err) {
    console.error("[/analyze] Error:", err.message);

    if (err.message.includes("K2Think")) {
      return res.status(502).json({
        error: "AI analysis service unavailable",
        detail: err.message,
      });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * For each holding, generate keywords and search Polymarket.
 * Returns a deduped, flattened array of candidate market objects.
 */
async function gatherCandidates(holdings) {
  const seen = new Map();

  // Process all holdings in parallel
  await Promise.all(
    holdings.map(async (holding) => {
      const keywords = await resolveKeywordsForHolding(holding);

      // Search each keyword (parallel within holding)
      const results = await Promise.allSettled(
        keywords.slice(0, 6).map((kw) =>
          searchMarketsByKeyword(kw, { limit: MARKETS_PER_KEYWORD })
        )
      );

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const market of result.value) {
          if (!seen.has(market.id)) {
            const daysLeft = market.endDate
              ? Math.max(0, Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000))
              : null;
            seen.set(market.id, {
              marketId: market.id,
              title: market.title,
              probability: market.probability,
              volume: Math.round(market.volume),
              liquidity: Math.round(market.liquidity),
              endDate: market.endDate,
              daysLeft,
              url: market.url,
            });
          }
        }
      }
    })
  );

  // Return top candidates by volume, capped
  return Array.from(seen.values())
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, MAX_CANDIDATES);
}

module.exports = { handler };
