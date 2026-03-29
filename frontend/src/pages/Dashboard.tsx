import { useEffect, useState } from 'react'
import { LogOut, Package, RefreshCw, Loader2, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fetchAllMarkets, analyzePortfolio } from '../api/client'
import PositionRow from '../components/PositionRow'
import BundleCard from '../components/BundleCard'
import HedgeExplainerModal from '../components/HedgeExplainerModal'
import Skeleton from '../components/Skeleton'
import AnalysisView from '../components/AnalysisView'

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
  const setAnalysisLoading = useStore((s) => s.setAnalysisLoading)
  const setAnalysisError = useStore((s) => s.setAnalysisError)

  const [loading, setLoading] = useState(true)
  const [showExplainer, setShowExplainer] = useState(false)
  const [objective, setObjective] = useState('hedge')

  useEffect(() => {
    if (positions.length === 0) { setLoading(false); return }
    fetchAllMarkets(positions).then(setMarkets).finally(() => setLoading(false))
  }, [positions.length])

  useEffect(() => {
    if (positions.length > 0 && !analysis && !analysisLoading) runAnalysis()
  }, [positions.length])

  const runAnalysis = async (obj?: string) => {
    if (positions.length === 0) return
    setAnalysisLoading(true); setAnalysisError(null)
    try { setAnalysis(await analyzePortfolio(positions, { objective: obj || objective, beginnerMode: true })) }
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
            onClick={() => { setLoggedIn(false); setAnalysis(null) }}
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
                  {(['hedge', 'amplify', 'explore'] as const).map((o) => (
                    <button key={o} onClick={() => { setObjective(o); runAnalysis(o) }}
                      className={`text-[11px] px-2.5 py-1 bg-transparent border-none cursor-pointer capitalize transition-colors duration-150 ${
                        objective === o ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'
                      }`}>{o}</button>
                  ))}
                  <button onClick={() => runAnalysis()} disabled={analysisLoading || positions.length === 0}
                    className="text-[11px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer disabled:opacity-30 transition-colors duration-150 ml-1">
                    <RefreshCw size={10} className={`inline mr-0.5 ${analysisLoading ? 'animate-spin' : ''}`} />
                    {analysisLoading ? 'Running' : 'Analyze'}
                  </button>
                </div>
              </div>
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

function TradeCard({ market }: { market: import('../types').Market }) {
  const toggleMarketSelection = useStore((s) => s.toggleMarketSelection)
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')
  const [tradeAmount, setTradeAmount] = useState(0)

  const priceYes = market.confidence
  const priceNo = 100 - market.confidence
  // Polymarket minimum price is 0.2¢ — use that floor for calculations to avoid division by zero
  const selectedPrice = Math.max(0.2, tradeSide === 'yes' ? priceYes : priceNo) / 100

  return (
    <div className="card-static overflow-hidden">
      {/* Header with dismiss */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-text-primary leading-snug">{market.title}</p>
          <p className="text-[11px] text-text-muted mt-1 font-medium">
            {market.category} · <span className="tabular-nums">${(market.volume / 1_000_000).toFixed(1)}M</span> Vol.
          </p>
        </div>
        <button
          onClick={() => toggleMarketSelection(market)}
          className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-red hover:bg-red-bg transition-all bg-transparent border-none cursor-pointer"
          aria-label="Remove"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Buy / Sell tabs */}
        <div className="flex items-center border-b border-border">
          {(['buy', 'sell'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTradeMode(mode)}
              className={`text-[14px] bg-transparent border-none cursor-pointer transition-all duration-200 mr-4 pb-2.5 capitalize ${
                tradeMode === mode
                  ? 'text-text-primary font-bold border-b-[3px] border-blue -mb-[1px]'
                  : 'text-text-muted font-medium hover:text-text-secondary'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Yes / No buttons */}
        <div className="flex gap-2">
          {(['yes', 'no'] as const).map((side) => {
            const price = side === 'yes' ? priceYes : priceNo
            return (
              <button
                key={side}
                onClick={() => setTradeSide(side)}
                className={`btn-3d flex-1 py-3 rounded-xl text-[13px] font-bold cursor-pointer border-2 transition-all duration-150 capitalize ${
                  tradeSide === side
                    ? side === 'yes'
                      ? 'bg-green-bg border-green text-green shadow-lg'
                      : 'bg-red-bg border-red text-red shadow-lg'
                    : 'bg-bg-input border-transparent text-text-muted hover:border-border-focus hover:text-text-secondary'
                }`}
              >
                {side} <span className="tabular-nums">{price}¢</span>
              </button>
            )
          })}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] text-text-primary font-semibold">{tradeMode === 'buy' ? 'Amount' : 'Shares'}</span>
            <div className="flex items-baseline">
              {tradeMode === 'buy' && (
                <span className={`text-[32px] font-extrabold tracking-tight leading-none transition-colors duration-200 ${tradeAmount > 0 ? 'text-text-primary' : 'text-border'}`}>$</span>
              )}
              <input
                type="number"
                min={0}
                value={tradeAmount || ''}
                placeholder="0"
                onChange={(e) => setTradeAmount(Math.max(0, Number(e.target.value) || 0))}
                className="text-[32px] font-extrabold tracking-tight tabular-nums leading-none bg-transparent border-none outline-none w-[90px] text-right text-text-primary placeholder:text-border"
                style={{ MozAppearance: 'textfield' }}
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            {(tradeMode === 'buy' ? [1, 5, 10, 100] : [1, 5, 10, 50]).map((v) => (
              <button
                key={v}
                onClick={() => setTradeAmount((prev) => prev + v)}
                className="btn-3d flex-1 text-[11px] font-semibold py-2 rounded-lg border border-border text-text-primary cursor-pointer bg-white hover:bg-bg-hover"
              >
                {tradeMode === 'buy' ? `+$${v}` : `+${v}`}
              </button>
            ))}
            <button
              onClick={() => setTradeAmount(0)}
              className="btn-3d text-[11px] font-semibold py-2 px-3 rounded-lg border border-border text-text-muted cursor-pointer bg-white hover:bg-bg-hover"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Payout estimate */}
        {tradeAmount > 0 && (
          <div className="bg-bg-page rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-text-muted">{tradeMode === 'buy' ? 'To win' : "You'll receive"}</span>
              <span className="text-text-primary font-bold tabular-nums">
                ${(tradeMode === 'buy' ? tradeAmount / selectedPrice : tradeAmount * selectedPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-text-muted">Avg. Price</span>
              <span className="text-text-primary font-bold tabular-nums">{(selectedPrice * 100).toFixed(1)}¢</span>
            </div>
          </div>
        )}

        {/* Trade button */}
        <button
          onClick={() => {
            if (!market.url || market.url === '#') return
            window.open(market.url, '_blank', 'noopener,noreferrer')
          }}
          disabled={!market.url || market.url === '#'}
          className="btn-glow w-full text-white font-bold py-3.5 rounded-xl text-[14px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none transition-all duration-200"
          style={{
            background: tradeSide === 'yes'
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'linear-gradient(135deg, #EF4444, #DC2626)',
            boxShadow: tradeSide === 'yes'
              ? '0 4px 0 0 #047857, 0 4px 20px rgba(16,185,129,0.3)'
              : '0 4px 0 0 #B91C1C, 0 4px 20px rgba(239,68,68,0.3)',
          }}
        >
          {tradeMode === 'buy' ? 'Buy' : 'Sell'} {tradeSide.toUpperCase()} on Polymarket
        </button>
      </div>
    </div>
  )
}
