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
