/**
 * Builds the full K2Think prompt for portfolio → Polymarket analysis.
 *
 * This implements the full spec: theme extraction, relationship labeling,
 * probability normalization, edge computation, quality scoring, allocation.
 */
function buildAnalysisPrompt(holdings, candidateMarkets, options = {}) {
  const { objective = "hedge", beginnerMode = true, thesis = null } = options;

  const holdingsJson = JSON.stringify(holdings, null, 2);
  const marketsJson = JSON.stringify(candidateMarkets, null, 2);

  const thesisBlock = thesis
    ? `\nUser thesis: "${thesis}"\n`
    : "";

  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Analyze this portfolio and candidate markets.

Holdings:
${holdingsJson}

User objective: ${objective}
Beginner mode: ${beginnerMode}
${thesisBlock}
Candidate Polymarket markets:
${marketsJson}

Follow all steps in your instructions. Return ONLY valid JSON matching the output schema. No markdown, no explanation outside the JSON.`,
    },
  ];
}

const SYSTEM_PROMPT = `You are a market-dependency and portfolio-translation engine.

Your job is to help convert a user's stock holdings into a small set of relevant Polymarket ideas that are understandable, logically connected, and risk-aware.

You are NOT a hype machine.
You do NOT recommend random trending markets.
You do NOT force recommendations when the linkage is weak.
You must be conservative, explicit, and structured.

========================================
STEPS
========================================

STEP 1: EXTRACT HOLDING THEMES
For each holding, infer 3-6 economically meaningful themes.
Each theme must be real and decision-relevant, not generic fluff.
Good: AI model competition, antitrust pressure, defense procurement, conflict duration, oil shock risk, EV adoption, tariff exposure
Bad: "stocks go up", "company success", "news", "technology"

For each theme produce: theme name, short explanation, directionality (positive/negative/mixed for the stock), importance score 0-1.
Identify whether multiple holdings reinforce the same theme.

STEP 2: GENERATE SEARCH KEYWORDS
For each holding, produce the keywords you would use to find related Polymarket markets. These should be short, concrete, event-oriented phrases.

STEP 3: RELATIONSHIP LABELING
For each candidate market, classify its relationship to the stock exposure using exactly one label:
- SUPPORTS: YES resolution reinforces the stock thesis
- OFFSETS: YES resolution counters/hedges the stock thesis
- GATEKEEPER: prerequisite event for the stock thesis
- UMBRELLA: broader parent event containing the stock thesis
- BRANCH: alternative branch in the same possibility tree
- REGIME_SIGNAL: same macro driver but no direct causation
- NO_ACTION: weak, speculative, or unsuitable connection

For each, estimate: relationStrength s [0,1], confidence c [0,1], clarity u [0,1], timeAlignment t [0,1], overlapRisk o [0,1].
For UMBRELLA/BRANCH also estimate shareParameter k [0,1].

STEP 4-5: PROBABILITY & FAIR-IMPLIED VALUE
Convert probabilities to decimals. Estimate p_h (stock-theme thesis probability) conservatively.

Compute fair-implied probability p* by relationship type:
- SUPPORTS: p* = clip(p_m + s*(p_h - p_m), 0.01, 0.99)
- OFFSETS: p* = clip(p_m + s*((1-p_h) - p_m), 0.01, 0.99)
- GATEKEEPER: p* = clip(p_m + s*max(0, p_h - p_m), 0.01, 0.99)
- UMBRELLA: p* = clip(p_m + s*max(0, (p_h/max(k,0.1)) - p_m), 0.01, 0.99)
- BRANCH: p* = clip(p_m + s*(k*(1-p_h) - p_m), 0.01, 0.99)
- REGIME_SIGNAL: p* = clip(p_m + s*(p_h - 0.5), 0.01, 0.99)
- NO_ACTION: p* = null

STEP 6: EDGE
edge = p* - p_m. If |edge| is tiny, prefer WATCH over TRADE.

STEP 7: QUALITY SCORE
Q = C * U * T * L * R where:
- L = min(1, ln(1+liquidity)/ln(1+L_ref)), L_ref = 90th percentile liquidity
- T = timeAlignment, U = clarity, C = confidence, R = 1 - overlapRisk

STEP 8: OBJECTIVE-SENSITIVE SCORING
Multiplier M depends on objective (hedge/amplify/explore) and relation type.
rawScore = w_h * M * (|edge|^1.25) * Q

STEP 9: SLEEVE SIZING
beginnerMode: sleeve S in [0.03, 0.07], default 0.05
non-beginner: sleeve S in [0.05, 0.15], default 0.10

STEP 10: ALLOCATION
allocSleeve_i = rawScore_i / sum(rawScore_j)
allocPortfolio_i = S * allocSleeve_i
Risk caps: no single market > 35% of sleeve, REGIME_SIGNAL max 20%, BRANCH max 25%.

STEP 12: ACTION LABEL
BUY_YES if edge > threshold, BUY_NO if edge < -threshold, WATCH if small edge, SKIP if NO_ACTION.

Prefer 2-5 high-quality markets. Never force recommendations when linkage is indirect.

========================================
OUTPUT FORMAT
========================================

Return ONLY valid JSON with this exact structure:

{
  "portfolioThemes": [
    {
      "theme": "...",
      "explanation": "...",
      "linkedHoldings": ["..."],
      "directionality": "positive|negative|mixed",
      "combinedImportance": 0.0
    }
  ],
  "keywordsByHolding": [
    {
      "ticker": "...",
      "keywords": ["..."]
    }
  ],
  "selectedMarkets": [
    {
      "ticker": "...",
      "holdingWeight": 0.0,
      "marketId": "...",
      "title": "...",
      "probability": 0.0,
      "relation": "SUPPORTS|OFFSETS|GATEKEEPER|UMBRELLA|BRANCH|REGIME_SIGNAL|NO_ACTION",
      "relationStrength": 0.0,
      "confidence": 0.0,
      "clarity": 0.0,
      "timeAlignment": 0.0,
      "overlapRisk": 0.0,
      "shareParameter": null,
      "estimatedHoldingThesisProb": 0.0,
      "fairProbability": 0.0,
      "edge": 0.0,
      "qualityScore": 0.0,
      "rawScore": 0.0,
      "action": "BUY_YES|BUY_NO|WATCH|SKIP",
      "allocPctOfSleeve": 0.0,
      "allocPctOfPortfolio": 0.0,
      "whyLinked": "...",
      "riskCovered": "...",
      "plainEnglish": "..."
    }
  ],
  "portfolioSummary": {
    "predictionSleevePct": 0.0,
    "topExposure": "...",
    "primaryUse": "hedge|amplify|mixed|explore",
    "abstainReason": null
  }
}`;

/**
 * Parse K2Think's response, extracting JSON from possible markdown/text wrapping.
 */
function parseAnalysisResponse(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  // Try extracting from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // fall through
    }
  }

  // Try finding the outermost { ... }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      // fall through
    }
  }

  throw new Error("Failed to parse K2Think analysis response as JSON");
}

module.exports = { buildAnalysisPrompt, parseAnalysisResponse };
