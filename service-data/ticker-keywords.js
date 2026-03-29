const { getQuote } = require("./yahoo-finance");

/**
 * Static ticker → keyword map for common tickers.
 *
 * Each entry lists search terms that connect the stock to Polymarket
 * prediction markets. Keywords are ordered by expected specificity —
 * themes first (most targeted), then sectors (broader coverage).
 */
const TICKER_KEYWORDS = {
  AAPL: {
    themes: ["apple", "iphone", "tim cook"],
    sectors: ["tariff", "china", "antitrust", "big tech"],
  },
  GOOGL: {
    themes: ["google", "alphabet", "youtube"],
    sectors: ["antitrust", "regulation", "big tech"],
  },
  MSFT: {
    themes: ["microsoft", "openai"],
    sectors: ["antitrust", "big tech"],
  },
  NVDA: {
    themes: ["nvidia", "chips"],
    sectors: ["tariff", "china", "export ban", "semiconductor"],
  },
  TSLA: {
    themes: ["tesla", "elon musk"],
    sectors: ["tariff", "china", "electric vehicle"],
  },
  LMT: {
    themes: ["lockheed", "defense"],
    sectors: ["iran", "china", "nato", "ukraine", "ceasefire"],
  },
  AMZN: {
    themes: ["amazon", "bezos"],
    sectors: ["tariff", "antitrust", "big tech"],
  },
  META: {
    themes: ["meta", "facebook", "zuckerberg", "instagram"],
    sectors: ["regulation", "big tech"],
  },
  BA: {
    themes: ["boeing"],
    sectors: ["faa", "airline", "defense"],
  },
  JPM: {
    themes: ["jpmorgan", "jamie dimon"],
    sectors: ["recession", "interest rate", "federal reserve", "banking"],
  },
  XOM: {
    themes: ["exxon"],
    sectors: ["oil", "opec", "iran", "energy"],
  },
  PFE: {
    themes: ["pfizer", "vaccine"],
    sectors: ["fda", "covid", "pandemic"],
  },
  COIN: {
    themes: ["coinbase"],
    sectors: ["bitcoin", "crypto", "ethereum", "regulation"],
  },
  RTX: {
    themes: ["raytheon"],
    sectors: ["iran", "china", "nato", "ukraine", "defense"],
  },
  GS: {
    themes: ["goldman sachs"],
    sectors: ["recession", "interest rate", "federal reserve", "banking"],
  },
};

// Cache for dynamically resolved company names: ticker → { name, resolvedAt }
const _nameCache = new Map();
const NAME_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get search keywords for a holding.
 *
 * If the ticker is in the static map, return those keywords immediately.
 * Otherwise, return a basic set from the companyName/ticker provided.
 * (Use resolveKeywordsForHolding for async resolution via Yahoo Finance.)
 */
function getKeywordsForHolding(holding) {
  const ticker = holding.ticker.toUpperCase();
  const entry = TICKER_KEYWORDS[ticker];

  if (entry) {
    return [...entry.themes, ...entry.sectors];
  }

  // Fallback: use company name words and the ticker itself
  return buildKeywordsFromName(holding.companyName || ticker, ticker);
}

/**
 * Async version that resolves the company name from Yahoo Finance
 * when the ticker isn't in the static map. Falls back gracefully.
 */
async function resolveKeywordsForHolding(holding) {
  const ticker = holding.ticker.toUpperCase();
  const entry = TICKER_KEYWORDS[ticker];

  if (entry) {
    return [...entry.themes, ...entry.sectors];
  }

  // Check name cache
  const cached = _nameCache.get(ticker);
  if (cached && Date.now() - cached.resolvedAt < NAME_CACHE_TTL) {
    return buildKeywordsFromName(cached.name, ticker);
  }

  // Try Yahoo Finance to get the real company name
  try {
    const quote = await getQuote(ticker);
    if (quote && quote.name) {
      _nameCache.set(ticker, { name: quote.name, resolvedAt: Date.now() });
      return buildKeywordsFromName(quote.name, ticker);
    }
  } catch {
    // Yahoo failed — fall through to basic fallback
  }

  // Final fallback
  const name = holding.companyName || ticker;
  _nameCache.set(ticker, { name, resolvedAt: Date.now() });
  return buildKeywordsFromName(name, ticker);
}

/**
 * Build search keywords from a company name string.
 *
 * Extracts meaningful words, generates variations:
 *   - Full name (if multi-word)
 *   - Individual significant words (>2 chars, not stopwords)
 *   - Common sector terms based on known patterns
 */
function buildKeywordsFromName(companyName, ticker) {
  const keywords = [];
  const name = (companyName || "").trim();

  if (!name) {
    keywords.push(ticker.toLowerCase());
    return keywords;
  }

  // Clean the name: remove common suffixes
  const cleaned = name
    .replace(/,?\s*(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|PLC|SA|AG|NV|SE|Group|Holdings|Co\.?|& Co\.?)$/gi, "")
    .trim();

  // Add the cleaned full name as a keyword (good for unique names)
  if (cleaned.length > 2) {
    keywords.push(cleaned.toLowerCase());
  }

  // Add individual significant words
  const STOP_WORDS = new Set([
    "the", "and", "of", "for", "in", "on", "at", "to", "by", "a", "an",
    "inc", "corp", "ltd", "plc", "llc", "co", "company", "group",
    "holdings", "international", "global", "technologies", "systems",
    "services", "solutions", "industries", "enterprises",
  ]);

  const words = cleaned.split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  for (const word of words) {
    if (!keywords.includes(word)) {
      keywords.push(word);
    }
  }

  // Add the ticker as a last-resort keyword
  const tickerLower = ticker.toLowerCase();
  if (!keywords.includes(tickerLower)) {
    keywords.push(tickerLower);
  }

  // Add broad sector keywords based on name patterns
  const nameLower = name.toLowerCase();
  const sectorKeywords = inferSectorKeywords(nameLower);
  for (const sk of sectorKeywords) {
    if (!keywords.includes(sk)) {
      keywords.push(sk);
    }
  }

  return keywords;
}

/**
 * Infer broad sector/macro keywords from a company name.
 * These cast a wider net on Polymarket.
 */
function inferSectorKeywords(nameLower) {
  const sectors = [];

  if (/bank|financ|capital|asset|invest/.test(nameLower)) {
    sectors.push("interest rate", "federal reserve", "recession");
  }
  if (/pharma|biotech|therapeut|medical|health/.test(nameLower)) {
    sectors.push("fda", "vaccine");
  }
  if (/energy|oil|gas|petrol|solar|wind|power/.test(nameLower)) {
    sectors.push("oil", "energy", "opec");
  }
  if (/semiconductor|chip|silicon/.test(nameLower)) {
    sectors.push("chips", "tariff", "china");
  }
  if (/defense|aero|military|weapon/.test(nameLower)) {
    sectors.push("defense", "nato", "ukraine");
  }
  if (/auto|motor|vehicle|car\b/.test(nameLower)) {
    sectors.push("tariff", "electric vehicle");
  }
  if (/crypto|blockchain|bitcoin|digital asset/.test(nameLower)) {
    sectors.push("bitcoin", "crypto", "regulation");
  }
  if (/retail|store|commerce|shop/.test(nameLower)) {
    sectors.push("tariff", "recession");
  }
  if (/insur/.test(nameLower)) {
    sectors.push("interest rate", "recession");
  }
  if (/airline|travel|hotel|cruise/.test(nameLower)) {
    sectors.push("recession", "oil");
  }

  return sectors;
}

module.exports = {
  TICKER_KEYWORDS,
  getKeywordsForHolding,
  resolveKeywordsForHolding,
  buildKeywordsFromName,
};
