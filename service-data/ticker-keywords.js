/**
 * Static ticker → keyword map for demo tickers.
 *
 * Each entry lists search terms that connect the stock to Polymarket
 * prediction markets. Keywords are ordered by expected specificity —
 * themes first (most targeted), then sectors (broader coverage).
 *
 * Keywords were chosen based on terms that actually appear on
 * Polymarket. Many company-specific terms (e.g. "iphone") have
 * zero matching markets, so we lean toward sector/macro themes
 * that do exist on the platform.
 *
 * For tickers not in this map, we fall back to the company name
 * and ticker symbol.
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

/**
 * Get search keywords for a holding.
 *
 * Priority: ticker-specific themes first (most specific),
 * then sector terms (broader), then fallback to companyName + ticker.
 */
function getKeywordsForHolding(holding) {
  const ticker = holding.ticker.toUpperCase();
  const entry = TICKER_KEYWORDS[ticker];

  if (entry) {
    return [...entry.themes, ...entry.sectors];
  }

  // Fallback: use company name words and the ticker itself
  const keywords = [];
  if (holding.companyName) {
    keywords.push(holding.companyName.toLowerCase());
  }
  keywords.push(ticker.toLowerCase());
  return keywords;
}

module.exports = { TICKER_KEYWORDS, getKeywordsForHolding };
