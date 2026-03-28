import type { Position, Market, BundleSummary } from '../types'
import { mockPositions, mockMarkets, mockBundleSummary } from './mock-data'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchPositions(): Promise<Position[]> {
  await delay(800)
  return mockPositions
}

export async function fetchAllMarkets(): Promise<Market[]> {
  await delay(600)
  return mockMarkets
}

export async function fetchBundleSummary(
  _stocks: Position[],
  _markets: Market[]
): Promise<BundleSummary> {
  await delay(1200)
  return mockBundleSummary
}

export async function loginRobinhood(
  _email: string,
  _password: string
): Promise<boolean> {
  await delay(1000)
  return true
}
