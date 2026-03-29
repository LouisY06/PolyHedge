export interface Position {
  ticker: string
  name: string
  shares: number
  avgCost: number
  currentPrice: number
  marketValue: number
  gainLoss: number
  gainLossPercent: number
}

export interface Market {
  id: string
  title: string
  image: string
  confidence: number
  volume: number
  endDate: string
  category: string
  url: string
  relatedTickers: string[]
}

export interface Bundle {
  id: string
  name: string
  stocks: Position[]
  markets: Market[]
  hedgePercent: number
  createdAt: string
}

export interface BundleSummary {
  explanation: string
  riskCovered: string
  hedgeRationale: string
}

// ── K2Think Analysis Types ───────────────────

export interface PortfolioTheme {
  theme: string
  explanation: string
  linkedHoldings: string[]
  directionality: 'positive' | 'negative' | 'mixed'
  combinedImportance: number
}

export interface SelectedMarket {
  ticker: string
  holdingWeight: number
  marketId: string
  title: string
  probability: number
  relation: string
  relationStrength: number
  confidence: number
  clarity: number
  timeAlignment: number
  overlapRisk: number
  shareParameter: number | null
  estimatedHoldingThesisProb: number
  fairProbability: number | null
  edge: number
  qualityScore: number
  rawScore: number
  action: 'BUY_YES' | 'BUY_NO' | 'WATCH' | 'SKIP'
  allocPctOfSleeve: number
  allocPctOfPortfolio: number
  whyLinked: string
  riskCovered: string
  plainEnglish: string
  url?: string
}

export interface PortfolioSummary {
  predictionSleevePct: number
  topExposure: string | null
  primaryUse: string
  abstainReason: string | null
}

export interface AnalysisResult {
  portfolioThemes: PortfolioTheme[]
  keywordsByHolding: { ticker: string; keywords: string[] }[]
  selectedMarkets: SelectedMarket[]
  portfolioSummary: PortfolioSummary
}
