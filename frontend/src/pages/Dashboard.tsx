import { useEffect, useState, useRef } from 'react'
import { LogOut, Package, RefreshCw, Loader2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fetchAllMarkets, analyzePortfolio } from '../api/client'
import PositionRow from '../components/PositionRow'
import BundleCard from '../components/BundleCard'
import HedgeExplainerModal from '../components/HedgeExplainerModal'
import Skeleton from '../components/Skeleton'
import AnalysisView from '../components/AnalysisView'
import PayoffChart from '../components/PayoffChart'

export default function Dashboard() {
  const positions = useStore((s) => s.positions)
  const markets = useStore((s) => s.markets)
  const setMarkets = useStore((s) => s.setMarkets)
  const selectedMarkets = useStore((s) => s.selectedMarkets)
  const bundles = useStore((s) => s.bundles)
  const setLoggedIn = useStore((s) => s.setLoggedIn)
  const analysis = useStore((s) => s.analysis)
  const analysisLoading = useStore((s) => s.analysisLoading)
  const analysisError = useStore((s) => s.analysisError)
  const setAnalysis = useStore((s) => s.setAnalysis)
  const analysisCache = useStore((s) => s.analysisCache)
  const setAnalysisCache = useStore((s) => s.setAnalysisCache)
  const clearAnalysisCache = useStore((s) => s.clearAnalysisCache)
  const setAnalysisLoading = useStore((s) => s.setAnalysisLoading)
  const setAnalysisError = useStore((s) => s.setAnalysisError)

  const [loading, setLoading] = useState(true)
  const [showExplainer, setShowExplainer] = useState(false)
  const [objective, setObjective] = useState('hedge')

  const pendingObjectives = useRef<Set<string>>(new Set())

  // Fetch markets only if we don't have them persisted
  useEffect(() => {
    if (positions.length === 0) { setLoading(false); return }
    if (markets.length > 0) { setLoading(false); return }
    fetchAllMarkets(positions).then(setMarkets).finally(() => setLoading(false))
  }, [positions.length])

  // Restore analysis from cache on mount, or run if no cache exists
  useEffect(() => {
    if (positions.length === 0) return

    // If we have cached results, restore and skip API calls
    if (Object.keys(analysisCache).length > 0) {
      if (!analysis && analysisCache['hedge']) setAnalysis(analysisCache['hedge'])
      return
    }

    if (analysisLoading) return

    // No cache — run hedge first, then background others
    runAnalysis('hedge')
    setTimeout(() => {
      runAnalysisBg('amplify')
      runAnalysisBg('explore')
    }, 100)
  }, [positions.length])

  const runAnalysisBg = async (obj: string) => {
    if (positions.length === 0 || pendingObjectives.current.has(obj)) return
    if (analysisCache[obj]) return
    pendingObjectives.current.add(obj)
    try {
      const result = await analyzePortfolio(positions, { objective: obj, beginnerMode: true })
      setAnalysisCache(obj, result)
    } catch { /* background — no UI error */ }
    finally { pendingObjectives.current.delete(obj) }
  }

  const runAnalysis = async (obj?: string) => {
    const target = obj || objective
    if (analysisCache[target]) {
      setAnalysis(analysisCache[target])
      return
    }
    if (positions.length === 0) return
    setAnalysisLoading(true); setAnalysisError(null)
    try {
      const result = await analyzePortfolio(positions, { objective: target, beginnerMode: true })
      setAnalysisCache(target, result)
      setAnalysis(result)
    }
    catch (err: unknown) { setAnalysisError(err instanceof Error ? err.message : 'Analysis failed') }
    finally { setAnalysisLoading(false) }
  }

  const totalValue = positions.reduce((s, p) => s + p.marketValue, 0)
  const totalGain = positions.reduce((s, p) => s + p.gainLoss, 0)
  const totalGainPercent =
    totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0
  const isPositive = totalGain >= 0


  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="border-b border-black/[0.04] sticky top-0 z-50 bg-white">
        <div className="max-w-[1200px] mx-auto px-5 h-[52px] flex items-center justify-between">
          <span className="text-text-primary font-semibold text-[16px] tracking-tight">
            PolyHedge
          </span>
          <button
            onClick={() => { setLoggedIn(false); setAnalysis(null); clearAnalysisCache(); setMarkets([]) }}
            className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer transition-colors duration-150"
            aria-label="Log out"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 py-6">
        {/* Portfolio summary */}
        {!loading && (
          <div className="mb-8">
            <p className="text-text-muted text-[13px] mb-1">Portfolio Value</p>
            <p className="text-[32px] font-medium text-text-primary tracking-tight leading-none tabular-nums">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[13px] tabular-nums ${isPositive ? 'text-green' : 'text-red'}`}>
                {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </span>
              <span className={`text-[13px] tabular-nums ${isPositive ? 'text-green' : 'text-red'}`}>
                {isPositive ? '+' : ''}${totalGain.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Analysis + Positions */}
          <div className="lg:col-span-2 space-y-6">
            {/* K2Think Analysis */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Portfolio Analysis</h2>
                <div className="flex items-center gap-1">
                  {(['index', 'hedge', 'amplify', 'explore'] as const).map((o) => (
                    <button key={o} onClick={() => {
                      setObjective(o)
                      if (o === 'index') return // index is computed client-side
                      if (analysisCache[o]) { setAnalysis(analysisCache[o]); setAnalysisError(null) } else { runAnalysis(o) }
                    }}
                      className={`text-[11px] px-2.5 py-1 bg-transparent border-none cursor-pointer capitalize transition-colors duration-150 ${
                        objective === o ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
                      }`}>{o}</button>
                  ))}
                  <button onClick={() => runAnalysis()} disabled={analysisLoading || positions.length === 0 || objective === 'index'}
                    className="text-[11px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer disabled:opacity-30 transition-colors duration-150 ml-1">
                    <RefreshCw size={10} className={`inline mr-0.5 ${analysisLoading ? 'animate-spin' : ''}`} />
                    {analysisLoading ? 'Running' : 'Analyze'}
                  </button>
                </div>
              </div>
              {objective === 'index' ? (
                <IndexView analysisCache={analysisCache} />
              ) : (
                <>
                  {analysisLoading && !analysis && (
                    <div className="py-8 text-center">
                      <Loader2 size={16} className="animate-spin text-text-muted mx-auto mb-2" />
                      <p className="text-text-muted text-[13px]">Analyzing portfolio...</p>
                    </div>
                  )}
                  {analysisError && (
                    <div className="py-6 text-center">
                      <p className="text-red text-[13px]">{analysisError}</p>
                      <button onClick={() => runAnalysis()} className="text-[12px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer mt-2 underline">Try again</button>
                    </div>
                  )}
                  {analysis && <AnalysisView analysis={analysis} />}
                </>
              )}
            </section>

            {/* Positions */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Stocks
              </h2>
              <button
                onClick={() => setShowExplainer(true)}
                className="text-[11px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer transition-colors duration-150"
              >
                What is hedging?
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[56px]" />
                ))}
              </div>
            ) : (
              <div>
                {positions.map((pos) => {
                  const relatedMarkets = markets.filter((m) =>
                    m.relatedTickers.includes(pos.ticker)
                  )
                  return (
                    <PositionRow
                      key={pos.ticker}
                      position={pos}
                      markets={relatedMarkets}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Trade Panels */}
          <div className="sticky top-[76px] max-h-[calc(100vh-92px)] overflow-y-auto space-y-4 pr-1">
            {selectedMarkets.length === 0 ? (
              <div className="py-8">
                <p className="text-[13px] text-text-muted pl-4">Select a market to trade</p>
              </div>
            ) : (
              selectedMarkets.map((market) => (
                <TradeCard key={market.id} market={market} />
              ))
            )}
          </div>
        </div>

        {/* Saved Bundles */}
        {bundles.length > 0 && (
          <section className="mt-8 animate-fade-in-up">
            <h2 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package size={14} className="text-purple" />
              Saved Bundles
            </h2>
            <div className="space-y-3">
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}
            </div>
          </section>
        )}
      </main>

      {showExplainer && (
        <HedgeExplainerModal onClose={() => setShowExplainer(false)} />
      )}
    </div>
  )
}

// ── Index View ──────────────────────────────────────────
// Computes a diversified "prediction market index" from cached analysis results.
// Aggregates markets across objectives, computes edge-weighted allocation,
// applies quarter-Kelly sizing capped at 15% per position.

function IndexView({ analysisCache }: {
  analysisCache: Record<string, import('../types').AnalysisResult>
}) {
  // Gather all actionable markets across cached objectives
  const seen = new Map<string, {
    title: string; ticker: string; probability: number; edge: number;
    confidence: number; qualityScore: number; holdingWeight: number;
    relation: string; action: string; url?: string; fairProbability: number | null
  }>()

  for (const result of Object.values(analysisCache)) {
    for (const sm of result.selectedMarkets) {
      if (sm.action === 'SKIP' || sm.action === 'WATCH') continue
      const existing = seen.get(sm.marketId)
      // Keep the version with the highest quality score
      if (!existing || sm.qualityScore > existing.qualityScore) {
        seen.set(sm.marketId, {
          title: sm.title, ticker: sm.ticker, probability: sm.probability,
          edge: sm.edge, confidence: sm.confidence, qualityScore: sm.qualityScore,
          holdingWeight: sm.holdingWeight, relation: sm.relation, action: sm.action,
          url: sm.url, fairProbability: sm.fairProbability,
        })
      }
    }
  }

  if (seen.size === 0) {
    return <p className="text-text-muted text-[13px] py-6">Waiting for analysis data. Switch to hedge first, then come back.</p>
  }

  // Compute allocation weights using edge + quality
  const entries = Array.from(seen.entries()).map(([id, m]) => {
    const absEdge = Math.abs(m.edge)
    // Quarter-Kelly: (edge / odds) / 4, simplified
    const p = m.probability > 0 && m.probability < 1 ? m.probability : 0.5
    const kellyFraction = Math.max(0, absEdge / (1 - p)) / 4
    // Weight = kelly × quality × confidence × holdingWeight
    const rawWeight = kellyFraction * m.qualityScore * m.confidence * Math.max(m.holdingWeight / 100, 0.05)
    return { id, ...m, rawWeight: Math.max(rawWeight, 0) }
  }).filter((e) => e.rawWeight > 0)

  if (entries.length === 0) {
    return <p className="text-text-muted text-[13px] py-6">No markets with sufficient edge to include in the index.</p>
  }

  // Normalize to 100%, cap each at 15%, redistribute excess
  let totalWeight = entries.reduce((s, e) => s + e.rawWeight, 0)
  let allocations = entries.map((e) => ({ ...e, pct: (e.rawWeight / totalWeight) * 100 }))

  // Cap and redistribute (iterate twice to stabilize)
  for (let round = 0; round < 3; round++) {
    let excess = 0
    let uncappedTotal = 0
    for (const a of allocations) {
      if (a.pct > 15) { excess += a.pct - 15; a.pct = 15 }
      else { uncappedTotal += a.pct }
    }
    if (excess > 0 && uncappedTotal > 0) {
      for (const a of allocations) {
        if (a.pct < 15) a.pct += (a.pct / uncappedTotal) * excess
      }
    }
  }

  // Sort by allocation descending
  allocations.sort((a, b) => b.pct - a.pct)
  // Re-normalize to exactly 100
  const sum = allocations.reduce((s, a) => s + a.pct, 0)
  allocations = allocations.map((a) => ({ ...a, pct: (a.pct / sum) * 100 }))


  return (
    <div>
      <p className="text-[11px] text-text-muted mb-3">Suggested allocation across {allocations.length} markets. Prices from Polymarket, targets estimated by AI.</p>
      {allocations.map((a) => {
        const isYes = a.action === 'BUY_YES'
        const side = isYes ? 'Yes' : 'No'
        const rawProb = a.probability <= 1 ? a.probability * 100 : a.probability
        const rawFair = a.fairProbability != null ? (a.fairProbability <= 1 ? a.fairProbability * 100 : a.fairProbability) : null
        // For BUY_NO, show the No side prices (flipped)
        const marketPrice = Math.round(isYes ? rawProb : 100 - rawProb)
        const targetPrice = rawFair != null ? Math.round(isYes ? rawFair : 100 - rawFair) : null

        return (
          <a key={a.id} href={a.url || '#'} target="_blank" rel="noopener noreferrer"
            className="block py-3 border-b border-black/[0.04] cursor-pointer hover:bg-bg-hover transition-colors -mx-1 px-1 rounded no-underline"
            onClick={(e) => { if (!a.url || a.url === '#') e.preventDefault() }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-text-primary leading-snug flex-1 min-w-0 mr-3">{a.title}</p>
              <span className="text-[15px] font-medium text-text-primary tabular-nums flex-shrink-0">{a.pct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span>{a.ticker}</span>
                <span>{side} {marketPrice}¢{targetPrice != null && targetPrice !== marketPrice && (<> → <span className={targetPrice > marketPrice ? 'text-green' : 'text-red'}>{targetPrice}¢</span></>)}</span>
              </div>
              <span className="text-[11px] text-text-muted">Trade →</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

function TradeCard({ market }: { market: import('../types').Market }) {
  const toggleMarketSelection = useStore((s) => s.toggleMarketSelection)
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')
  const [tradeAmount, setTradeAmount] = useState(0)

  const priceYes = market.confidence
  const priceNo = 100 - market.confidence
  // Polymarket minimum price is 0.2¢ — use that floor for calculations to avoid division by zero
  const selectedPrice = Math.max(0.2, tradeSide === 'yes' ? priceYes : priceNo) / 100

  const toWin = tradeMode === 'buy' ? tradeAmount / selectedPrice : tradeAmount * selectedPrice

  return (
    <div className="rounded-2xl border border-[#E8E8E8] bg-white overflow-hidden" style={{ boxShadow: '-2px 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.08)' }}>
      {/* Title */}
      <div className="px-4 pt-3 pb-1 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug">{market.title}</p>
          <p className="text-[11px] text-[#999] mt-0.5">
            {market.category} · ${(market.volume / 1_000_000).toFixed(1)}M Vol.
          </p>
        </div>
        <button
          onClick={() => toggleMarketSelection(market)}
          className="flex-shrink-0 p-0.5 text-[#999] hover:text-[#333] transition-colors bg-transparent border-none cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>

      <div className="px-4 pb-4">
        {/* Buy / Sell */}
        <div className="flex items-center gap-3 pt-2 pb-2 border-b border-[#F0F0F0]">
          {(['buy', 'sell'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTradeMode(mode)}
              className={`text-[14px] bg-transparent border-none cursor-pointer capitalize transition-colors ${
                tradeMode === mode
                  ? 'text-[#1A1A1A] font-semibold'
                  : 'text-[#B0B0B0] font-normal hover:text-[#666]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Yes / No */}
        <div className="flex gap-2 pt-3 pb-3">
          {(['yes', 'no'] as const).map((side) => {
            const price = side === 'yes' ? priceYes : priceNo
            const isActive = tradeSide === side
            return (
              <button
                key={side}
                onClick={() => setTradeSide(side)}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-all duration-100"
                style={{
                  background: isActive
                    ? side === 'yes' ? '#34A853' : '#EA4335'
                    : '#F2F2F2',
                  color: isActive ? '#fff' : '#666',
                }}
              >
                {side === 'yes' ? 'Yes' : 'No'} {price}¢
              </button>
            )
          })}
        </div>

        {/* Amount */}
        <div className="pb-3">
          <div className="flex items-end justify-between mb-2">
            <p className="text-[13px] text-[#1A1A1A] font-semibold">{tradeMode === 'buy' ? 'Amount' : 'Shares'}</p>
            <div className="flex items-baseline">
              {tradeMode === 'buy' && (
                <span className={`text-[28px] font-semibold tracking-tight leading-none ${tradeAmount > 0 ? 'text-[#1A1A1A]' : 'text-[#D0D0D0]'}`}>$</span>
              )}
              <input
                type="number"
                min={0}
                value={tradeAmount || ''}
                placeholder="0"
                autoFocus
                onChange={(e) => setTradeAmount(Math.max(0, Number(e.target.value) || 0))}
                className="text-[28px] font-semibold tracking-tight leading-none bg-transparent border-none outline-none w-[100px] text-right text-[#1A1A1A] placeholder:text-[#D0D0D0] caret-[#1A1A1A]"
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            {(tradeMode === 'buy' ? [1, 5, 10, 100] : [1, 5, 10, 50]).map((v) => (
              <button
                key={v}
                onClick={() => setTradeAmount((prev) => prev + v)}
                className="flex-1 text-[12px] font-medium py-1.5 rounded-lg border border-[#E0E0E0] text-[#333] cursor-pointer bg-white hover:bg-[#F8F8F8] transition-colors"
              >
                {tradeMode === 'buy' ? `+$${v}` : `+${v}`}
              </button>
            ))}
            <button
              onClick={() => setTradeAmount(0)}
              className="text-[12px] font-medium py-1.5 px-3 rounded-lg border border-[#E0E0E0] text-[#999] cursor-pointer bg-white hover:bg-[#F8F8F8] transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        {/* Payout */}
        {tradeAmount > 0 && (
          <div className="border-t border-[#F0F0F0] pt-3 pb-1">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[13px] text-[#1A1A1A] font-semibold">
                  {tradeMode === 'buy' ? 'To win' : "You'll receive"}
                </p>
                <p className="text-[11px] text-[#999] mt-0.5">
                  Avg. Price {(selectedPrice * 100).toFixed(1)}¢
                </p>
              </div>
              <p className="text-[28px] font-semibold tracking-tight tabular-nums" style={{ color: tradeSide === 'yes' ? '#34A853' : '#EA4335' }}>
                ${toWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Payoff Chart */}
        <PayoffChart
          probability={market.confidence}
          amount={tradeAmount}
          side={tradeSide}
          mode={tradeMode}
        />

        {/* Trade button */}
        <button
          onClick={() => {
            if (!market.url || market.url === '#') return
            window.open(market.url, '_blank', 'noopener,noreferrer')
          }}
          disabled={!market.url || market.url === '#'}
          className="w-full font-semibold py-2.5 rounded-lg text-[14px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none transition-colors duration-150 mt-2"
          style={{
            background: tradeSide === 'yes' ? '#34A853' : '#EA4335',
            color: '#fff',
          }}
        >
          {tradeMode === 'buy' ? 'Buy' : 'Sell'} {tradeSide === 'yes' ? 'Yes' : 'No'}
        </button>
      </div>
    </div>
  )
}
