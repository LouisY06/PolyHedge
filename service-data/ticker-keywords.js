const { getQuote, getCompanyProfile } = require("./yahoo-finance");

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
 * Async version that resolves keywords using Yahoo Finance profile data.
 * Uses company description, sector, and industry to extract meaningful
 * search terms — much better for niche stocks whose names don't reveal
 * their industry (e.g. "Intuitive Machines" → space, lunar lander).
 */
async function resolveKeywordsForHolding(holding) {
  const ticker = holding.ticker.toUpperCase();
  const entry = TICKER_KEYWORDS[ticker];

  if (entry) {
    return [...entry.themes, ...entry.sectors];
  }

  // Check cache
  const cached = _nameCache.get(ticker);
  if (cached && Date.now() - cached.resolvedAt < NAME_CACHE_TTL) {
    return cached.keywords;
  }

  // Fetch quote + profile in parallel
  const [quote, profile] = await Promise.allSettled([
    getQuote(ticker),
    getCompanyProfile(ticker),
  ]);

  const name = (quote.status === "fulfilled" && quote.value?.name) || holding.companyName || ticker;
  const prof = profile.status === "fulfilled" ? profile.value : null;

  // Start with name-based keywords
  const keywords = buildKeywordsFromName(name, ticker);

  // Add industry and sector as keywords (these are gold for matching)
  if (prof?.industry) {
    const ind = prof.industry.toLowerCase();
    if (!keywords.includes(ind)) keywords.push(ind);
    // Also add individual words from industry if meaningful
    for (const w of ind.split(/\s+/).filter((w) => w.length > 3)) {
      if (!keywords.includes(w)) keywords.push(w);
    }
  }
  if (prof?.sector) {
    const sec = prof.sector.toLowerCase();
    if (!keywords.includes(sec)) keywords.push(sec);
  }

  // Extract keywords from business description
  if (prof?.description) {
    const descKeywords = extractKeywordsFromDescription(prof.description);
    for (const dk of descKeywords) {
      if (!keywords.includes(dk)) keywords.push(dk);
    }
  }

  // Also run sector inference on the combined name + industry + description
  const combinedText = [name, prof?.industry || "", prof?.sector || ""].join(" ").toLowerCase();
  const sectorKws = inferSectorKeywords(combinedText);
  for (const sk of sectorKws) {
    if (!keywords.includes(sk)) keywords.push(sk);
  }

  _nameCache.set(ticker, { name, keywords, resolvedAt: Date.now() });
  return keywords;
}

/**
 * Extract high-signal keywords from a company's business description.
 * Looks for terms that are likely to appear in Polymarket titles.
 */
function extractKeywordsFromDescription(description) {
  const text = description.toLowerCase();
  const found = [];

  // Map of patterns → keywords to add when matched
  const DESCRIPTION_PATTERNS = [
    [/\bspace\b|spacecraft|launch vehicle|orbital/, ["space", "spacex", "nasa"]],
    [/\blunar\b|moon/, ["moon", "nasa", "artemis"]],
    [/\bsatellite|leo\b|low.earth.orbit/, ["satellite", "starlink"]],
    [/\brocket|launch/, ["spacex", "rocket"]],
    [/\bai\b|artificial intelligence|machine learning|deep learning/, ["artificial intelligence", "openai", "nvidia"]],
    [/\bcancer|oncolog|tumor|immuno.?therap/, ["cancer", "fda", "drug approval"]],
    [/\bdrug|therapeutic|clinical trial|pharma/, ["fda", "drug approval"]],
    [/\bvaccine|mrna|antibod/, ["vaccine", "fda"]],
    [/\bcrypto|blockchain|digital asset|defi|web3/, ["bitcoin", "crypto", "ethereum"]],
    [/\belectric vehicle|ev\b|battery|lithium/, ["electric vehicle", "tesla", "battery"]],
    [/\bautonomo|self.driving|lidar|adas/, ["autonomous", "tesla", "waymo"]],
    [/\bsolar|wind energy|renewable|clean energy/, ["solar", "energy", "climate"]],
    [/\bnuclear|uranium|reactor/, ["nuclear", "energy", "uranium"]],
    [/\boil|natural gas|petroleum|drilling|fracking/, ["oil", "opec", "energy"]],
    [/\bgold|silver|precious metal/, ["gold", "commodity"]],
    [/\bdefense|military|weapon|munition|missile/, ["defense", "nato", "ukraine", "iran"]],
    [/\bcybersecurity|cyber|infosec/, ["cybersecurity", "hacking"]],
    [/\bcannabis|marijuana|thc|cbd/, ["cannabis", "legalization"]],
    [/\bgaming|esport|video game/, ["gaming"]],
    [/\bstreaming|content|entertainment/, ["streaming", "netflix"]],
    [/\bsemiconductor|chip|wafer|fabricat/, ["chips", "nvidia", "tariff", "china"]],
    [/\bcloud|saas|software.as/, ["cloud", "microsoft", "amazon"]],
    [/\btelecom|wireless|5g|cellular/, ["5g", "telecom"]],
    [/\binsurance|underwriting/, ["interest rate", "recession"]],
    [/\breal estate|reit|property|mortgage/, ["interest rate", "housing"]],
    [/\bmining|copper|cobalt|rare earth/, ["china", "tariff", "mining"]],
    [/\bchina|chinese/, ["china", "tariff"]],
    [/\bindia|indian/, ["india"]],
    [/\btariff|trade war|import|export/, ["tariff", "china"]],
    [/\bfederal reserve|interest rate|monetary policy/, ["federal reserve", "interest rate"]],
    [/\bquantum comput/, ["quantum computing"]],
    [/\bdrone|uav|unmanned/, ["drone", "defense"]],
    [/\b3d print|additive manufactur/, ["3d printing"]],
    [/\brobot|automat/, ["robotics", "artificial intelligence"]],
  ];

  for (const [pattern, kws] of DESCRIPTION_PATTERNS) {
    if (pattern.test(text)) {
      for (const kw of kws) {
        if (!found.includes(kw)) found.push(kw);
      }
    }
  }

  return found;
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
    // Generic words that cause false matches on Polymarket
    "life", "sciences", "science", "advanced", "first", "new", "next",
    "digital", "national", "united", "general", "american", "standard",
    "pacific", "north", "south", "east", "west", "central", "world",
    "resources", "partners", "management", "acquisition", "brands",
    "one", "two", "three", "plus", "super", "ultra", "mega", "premier",
    "trust", "fund", "select", "core", "total", "pure", "true", "real",
  ]);

  const words = cleaned.split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  for (const word of words) {
    if (!keywords.includes(word)) {
      keywords.push(word);
    }
  }

  // Only add ticker as keyword if it's long enough to be meaningful
  // Short tickers like "AAL", "AST" cause too many false matches
  const tickerLower = ticker.toLowerCase();
  if (tickerLower.length >= 5 && !keywords.includes(tickerLower)) {
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
  if (/pharma|biotech|therapeut|medical|health|life science|oncolog|genomic|diagnost/.test(nameLower)) {
    sectors.push("fda", "vaccine", "drug approval", "clinical trial");
  }
  if (/energy|oil|gas|petrol|solar|wind|power/.test(nameLower)) {
    sectors.push("oil", "energy", "opec");
  }
  if (/semiconductor|chip|silicon/.test(nameLower)) {
    sectors.push("chips", "tariff", "china", "nvidia");
  }
  if (/defense|aero|military|weapon|lockheed|raytheon|northrop/.test(nameLower)) {
    sectors.push("defense", "nato", "ukraine", "iran", "military");
  }
  if (/auto|motor|vehicle|car\b/.test(nameLower)) {
    sectors.push("tariff", "electric vehicle", "tesla");
  }
  if (/crypto|blockchain|bitcoin|digital asset|coinbase/.test(nameLower)) {
    sectors.push("bitcoin", "crypto", "ethereum", "regulation");
  }
  if (/retail|store|commerce|shop/.test(nameLower)) {
    sectors.push("tariff", "recession");
  }
  if (/insur/.test(nameLower)) {
    sectors.push("interest rate", "recession");
  }
  if (/airline|travel|hotel|cruise/.test(nameLower)) {
    sectors.push("recession", "tariff", "tourism", "boeing");
  }
  if (/space|rocket|satellite|orbital|launch/.test(nameLower)) {
    sectors.push("spacex", "elon musk", "nasa", "satellite", "starlink");
  }
  if (/ai\b|artificial intel|machine learn|neural|deep learn/.test(nameLower)) {
    sectors.push("artificial intelligence", "openai", "google", "nvidia");
  }
  if (/cloud|software|saas|data/.test(nameLower)) {
    sectors.push("microsoft", "google", "amazon");
  }
  if (/gaming|game|entertainment|streaming|media/.test(nameLower)) {
    sectors.push("gaming", "streaming", "netflix");
  }
  if (/food|beverage|restaurant|agri/.test(nameLower)) {
    sectors.push("tariff", "recession", "inflation");
  }
  if (/telecom|wireless|5g|network/.test(nameLower)) {
    sectors.push("5g", "spectrum", "regulation");
  }
  if (/mining|metal|steel|copper|lithium|gold/.test(nameLower)) {
    sectors.push("china", "tariff", "recession", "gold");
  }
  if (/cannabis|marijuana|weed/.test(nameLower)) {
    sectors.push("cannabis", "legalization", "regulation");
  }
  if (/real estate|reit|property|housing|mortgage/.test(nameLower)) {
    sectors.push("interest rate", "federal reserve", "housing");
  }

  return sectors;
}

module.exports = {
  TICKER_KEYWORDS,
  getKeywordsForHolding,
  resolveKeywordsForHolding,
  buildKeywordsFromName,
};
