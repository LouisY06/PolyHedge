import type { Position, Market, BundleSummary, AnalysisResult } from '../types'
import { mockMarkets, mockBundleSummary } from './mock-data'

const API_BASE = 'http://localhost:4000'
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Position import (real backend) ─────────────────────

interface BackendPosition {
  ticker: string
  name: string
  shares: number
  averageCost: number | null
  currentPrice: number | null
  marketValue: number | null
  gainLoss: number | null
  gainLossPercent: number | null
}

function toFrontendPosition(bp: BackendPosition): Position {
  return {
    ticker: bp.ticker,
    name: bp.name || bp.ticker,
    shares: bp.shares,
    avgCost: bp.averageCost ?? 0,
    currentPrice: bp.currentPrice ?? bp.averageCost ?? 0,
    marketValue: bp.marketValue ?? bp.shares * (bp.currentPrice ?? bp.averageCost ?? 0),
    gainLoss: bp.gainLoss ?? 0,
    gainLossPercent: bp.gainLossPercent ?? 0,
  }
}

export async function uploadCSV(file: File): Promise<Position[]> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/positions/upload`, { method: 'POST', body: form })
  if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Upload failed' })); throw new Error(err.error || 'Upload failed') }
  const data = await res.json()
  return (data.positions as BackendPosition[]).map(toFrontendPosition)
}

export async function submitManualPositions(
  positions: { ticker: string; shares: number; averageCost?: number }[]
): Promise<Position[]> {
  const res = await fetch(`${API_BASE}/positions/manual`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Request failed' })); throw new Error(err.error || 'Request failed') }
  const data = await res.json()
  return (data.positions as BackendPosition[]).map(toFrontendPosition)
}

// ── Chart data ─────────────────────────────────────────

export interface ChartPoint { time: number; price: number }
export interface ChartData { ticker: string; previousClose: number | null; points: ChartPoint[] }

export async function fetchChart(ticker: string): Promise<ChartData | null> {
  try {
    const res = await fetch(`${API_BASE}/chart?ticker=${encodeURIComponent(ticker)}&range=5d&interval=15m`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ── K2Think analysis ───────────────────────────────────

export async function analyzePortfolio(
  positions: Position[],
  options: { objective?: string; beginnerMode?: boolean; thesis?: string } = {}
): Promise<AnalysisResult> {
  const totalValue = positions.reduce((s, p) => s + (p.marketValue || p.shares * p.avgCost), 0)
  const holdings = positions.map((p) => {
    const value = p.marketValue || p.shares * p.avgCost
    return { ticker: p.ticker, companyName: p.name, weight: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0 }
  })
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, objective: options.objective || 'hedge', beginnerMode: options.beginnerMode ?? true, thesis: options.thesis || null }),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Analysis failed' })); throw new Error(err.error || 'Analysis failed') }
  return res.json()
}

// ── Mock data (markets/bundles) ────────────────────────

export async function fetchPositions(): Promise<Position[]> { return [] }

export async function fetchAllMarkets(): Promise<Market[]> { await delay(600); return mockMarkets }

export async function fetchBundleSummary(_stocks: Position[], _markets: Market[]): Promise<BundleSummary> { await delay(1200); return mockBundleSummary }

export async function loginRobinhood(_email: string, _password: string): Promise<boolean> { await delay(1000); return true }
