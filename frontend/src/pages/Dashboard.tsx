import { useEffect, useState } from 'react'
import { LogOut, TrendingUp, TrendingDown, Plus, Package } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fetchPositions, fetchAllMarkets } from '../api/client'
import type { Bundle } from '../types'
import PositionRow from '../components/PositionRow'
import BundleCard from '../components/BundleCard'
import HedgeDial from '../components/HedgeDial'
import HedgeExplainerModal from '../components/HedgeExplainerModal'
import Skeleton from '../components/Skeleton'

export default function Dashboard() {
  const positions = useStore((s) => s.positions)
  const setPositions = useStore((s) => s.setPositions)
  const markets = useStore((s) => s.markets)
  const setMarkets = useStore((s) => s.setMarkets)
  const selectedMarkets = useStore((s) => s.selectedMarkets)
  const bundles = useStore((s) => s.bundles)
  const addBundle = useStore((s) => s.addBundle)
  const clearSelections = useStore((s) => s.clearSelections)
  const setLoggedIn = useStore((s) => s.setLoggedIn)

  const [loading, setLoading] = useState(true)
  const [bundleName, setBundleName] = useState('')
  const [hedgePercent, setHedgePercent] = useState(50)
  const [showExplainer, setShowExplainer] = useState(false)
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')
  const [tradeAmount, setTradeAmount] = useState(0)
  const [trading, setTrading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchPositions().then(setPositions),
      fetchAllMarkets().then(setMarkets),
    ]).finally(() => setLoading(false))
  }, [])

  const totalValue = positions.reduce((s, p) => s + p.marketValue, 0)
  const totalGain = positions.reduce((s, p) => s + p.gainLoss, 0)
  const totalGainPercent =
    totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0
  const isPositive = totalGain >= 0

  const relatedStocks = positions.filter((p) =>
    selectedMarkets.some((m) => m.relatedTickers.includes(p.ticker))
  )

  const handleSaveBundle = () => {
    if (!bundleName.trim() || selectedMarkets.length === 0) return
    const bundle: Bundle = {
      id: crypto.randomUUID(),
      name: bundleName.trim(),
      stocks: relatedStocks,
      markets: [...selectedMarkets],
      hedgePercent,
      createdAt: new Date().toISOString(),
    }
    addBundle(bundle)
    setBundleName('')
    clearSelections()
    setHedgePercent(50)
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="bg-bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 h-[56px] flex items-center justify-between">
          <span className="text-text-primary font-bold text-lg tracking-tight">
            PolyHedge
          </span>
          <button
            onClick={() => setLoggedIn(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-text-muted hover:text-red hover:bg-bg-hover transition-colors bg-transparent border-none cursor-pointer"
            aria-label="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-5">
        {/* Portfolio Summary */}
        {!loading && (
          <div className="bg-bg-card border border-border rounded-lg p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-text-secondary text-xs font-medium mb-0.5">
                  Portfolio Value
                </p>
                <p className="text-3xl font-bold text-text-primary tracking-tight">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div
                  className={`flex items-center gap-1 mt-1 text-sm font-semibold ${
                    isPositive ? 'text-green' : 'text-red'
                  }`}
                >
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isPositive ? '+' : ''}${totalGain.toFixed(2)} (
                  {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-bg-page rounded-lg px-3 py-1.5 text-center min-w-[56px]">
                  <p className="text-text-muted text-[10px] font-medium">Positions</p>
                  <p className="text-text-primary font-bold">{positions.length}</p>
                </div>
                <div className="bg-bg-page rounded-lg px-3 py-1.5 text-center min-w-[56px]">
                  <p className="text-text-muted text-[10px] font-medium">Markets</p>
                  <p className="text-text-primary font-bold">{markets.length}</p>
                </div>
                <div className="bg-bg-page rounded-lg px-3 py-1.5 text-center min-w-[56px]">
                  <p className="text-text-muted text-[10px] font-medium">Bundles</p>
                  <p className="text-text-primary font-bold">{bundles.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Positions */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Your Positions & Related Events
              </h2>
              <button
                onClick={() => setShowExplainer(true)}
                className="text-xs text-blue hover:underline bg-transparent border-none cursor-pointer font-medium"
              >
                What is hedging?
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
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

          {/* Right: Trade Panel */}
          <div className="space-y-4">
            {/* Trade card */}
            <div className="bg-bg-card border border-border rounded-lg sticky top-[72px] shadow-sm">
              {/* Event title */}
              <div className="px-5 pt-5 pb-3">
                {selectedMarkets.length > 0 ? (
                  <>
                    <p className="text-base font-bold text-text-primary leading-snug">
                      {selectedMarkets[selectedMarkets.length - 1].title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {selectedMarkets[selectedMarkets.length - 1].category} · ${(selectedMarkets[selectedMarkets.length - 1].volume / 1_000_000).toFixed(1)}M Vol.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-muted">
                    Select an event to trade
                  </p>
                )}
              </div>

              <div className="px-5 pb-5 space-y-4">
                {/* Buy / Sell tabs */}
                <div className="flex items-center">
                  <button
                    onClick={() => setTradeMode('buy')}
                    className={`text-[15px] bg-transparent border-none cursor-pointer transition-colors mr-3 ${
                      tradeMode === 'buy'
                        ? 'text-text-primary font-bold'
                        : 'text-text-muted font-medium hover:text-text-secondary'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeMode('sell')}
                    className={`text-[15px] bg-transparent border-none cursor-pointer transition-colors ${
                      tradeMode === 'sell'
                        ? 'text-text-primary font-bold'
                        : 'text-text-muted font-medium hover:text-text-secondary'
                    }`}
                  >
                    Sell
                  </button>
                  <span className="ml-auto text-sm text-text-secondary flex items-center gap-1 cursor-pointer">
                    Market
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>

                {/* Outcome buttons */}
                {selectedMarkets.length > 0 && (() => {
                  const activeMarket = selectedMarkets[selectedMarkets.length - 1]
                  return (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTradeSide('yes')}
                        className={`btn-3d flex-1 py-3 rounded-full text-sm font-semibold cursor-pointer border ${
                          tradeSide === 'yes'
                            ? 'bg-bg-card border-text-primary text-text-primary'
                            : 'bg-bg-input border-border text-text-secondary hover:border-text-muted'
                        }`}
                      >
                        Yes {activeMarket.confidence}¢
                      </button>
                      <button
                        onClick={() => setTradeSide('no')}
                        className={`btn-3d flex-1 py-3 rounded-full text-sm font-semibold cursor-pointer border ${
                          tradeSide === 'no'
                            ? 'bg-bg-card border-text-primary text-text-primary'
                            : 'bg-bg-input border-border text-text-secondary hover:border-text-muted'
                        }`}
                      >
                        No {100 - activeMarket.confidence}¢
                      </button>
                    </div>
                  )
                })()}

                {/* Amount */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] text-text-primary font-medium">Amount</span>
                    <span className={`text-4xl font-bold tracking-tight ${tradeAmount > 0 ? 'text-text-primary' : 'text-text-muted/40'}`}>
                      ${tradeAmount}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[1, 5, 10, 100].map((v) => (
                      <button
                        key={v}
                        onClick={() => setTradeAmount((prev) => prev + v)}
                        className="btn-3d text-[13px] font-medium py-1.5 px-3 rounded-full border border-border text-text-primary hover:bg-bg-hover cursor-pointer bg-bg-card"
                      >
                        +${v}
                      </button>
                    ))}
                    <button
                      onClick={() => setTradeAmount(0)}
                      className="btn-3d text-[13px] font-medium py-1.5 px-3 rounded-full border border-border text-text-secondary hover:bg-bg-hover cursor-pointer bg-bg-card"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Trade button */}
                <button
                  onClick={async () => {
                    if (tradeAmount <= 0 || selectedMarkets.length === 0) return
                    setTrading(true)
                    await new Promise((r) => setTimeout(r, 800))
                    setTrading(false)
                    setTradeSuccess(true)
                    setTimeout(() => {
                      setTradeSuccess(false)
                      setTradeAmount(0)
                    }, 2000)
                  }}
                  disabled={tradeAmount <= 0 || selectedMarkets.length === 0 || trading}
                  className="btn-3d btn-3d-blue w-full bg-blue text-white font-bold py-3.5 rounded-full text-[15px] disabled:opacity-30 cursor-pointer border-none"
                >
                  {trading
                    ? 'Processing...'
                    : tradeSuccess
                    ? 'Order placed!'
                    : 'Trade'}
                </button>

                <p className="text-text-muted text-[11px] text-center">
                  By trading, you agree to the Terms of Use.
                </p>
              </div>
            </div>

            {/* Hedge Builder (below trade card) */}
            <div className="bg-bg-card border border-border rounded-lg p-4 space-y-4">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Hedge Builder
              </h3>

              {selectedMarkets.length > 0 && (
                <div className="space-y-1">
                  {selectedMarkets.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="text-text-primary truncate flex-1 mr-2">
                        {m.title}
                      </span>
                      <span className="text-green font-bold flex-shrink-0">
                        {m.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {relatedStocks.length > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Related stocks</span>
                  <span className="text-text-primary font-semibold">
                    {relatedStocks.map((s) => s.ticker).join(', ')}
                  </span>
                </div>
              )}

              <HedgeDial value={hedgePercent} onChange={setHedgePercent} />

              <input
                type="text"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="Bundle name"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-blue transition-colors"
              />

              <button
                onClick={handleSaveBundle}
                disabled={!bundleName.trim() || selectedMarkets.length === 0}
                className="btn-3d w-full flex items-center justify-center gap-1.5 bg-text-primary text-bg-card font-semibold py-2.5 rounded-lg text-sm disabled:opacity-30 cursor-pointer border-none"
              >
                <Plus size={15} />
                Save Bundle
              </button>
            </div>
          </div>
        </div>

        {/* Saved Bundles */}
        {bundles.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package size={12} />
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
