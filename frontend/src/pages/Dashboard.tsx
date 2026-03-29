import { useEffect, useState } from 'react'
import { LogOut, TrendingUp, TrendingDown, Plus, Package, Shield, BarChart3, RefreshCw, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fetchMarketsForPositions, analyzePortfolio } from '../api/client'
import type { Bundle } from '../types'
import PositionRow from '../components/PositionRow'
import BundleCard from '../components/BundleCard'
import HedgeDial from '../components/HedgeDial'
import HedgeExplainerModal from '../components/HedgeExplainerModal'
import Skeleton from '../components/Skeleton'
import AnalysisView from '../components/AnalysisView'
import PayoffChart from '../components/PayoffChart'
import PayoutHeatmap from '../components/PayoutHeatmap'

export default function Dashboard() {
  const positions = useStore((s) => s.positions)
  const markets = useStore((s) => s.markets)
  const setMarkets = useStore((s) => s.setMarkets)
  const selectedMarkets = useStore((s) => s.selectedMarkets)
  const bundles = useStore((s) => s.bundles)
  const addBundle = useStore((s) => s.addBundle)
  const clearSelections = useStore((s) => s.clearSelections)
  const setLoggedIn = useStore((s) => s.setLoggedIn)
  const analysis = useStore((s) => s.analysis)
  const analysisLoading = useStore((s) => s.analysisLoading)
  const analysisError = useStore((s) => s.analysisError)
  const setAnalysis = useStore((s) => s.setAnalysis)
  const setAnalysisLoading = useStore((s) => s.setAnalysisLoading)
  const setAnalysisError = useStore((s) => s.setAnalysisError)

  const [loading, setLoading] = useState(true)
  const [bundleName, setBundleName] = useState('')
  const [hedgePercent, setHedgePercent] = useState(50)
  const [showExplainer, setShowExplainer] = useState(false)
  const [objective, setObjective] = useState('hedge')
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')
  const [tradeAmount, setTradeAmount] = useState(0)
  const [trading, setTrading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState(false)

  useEffect(() => {
    if (positions.length > 0) {
      fetchMarketsForPositions(positions).then(setMarkets).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [positions.length])

  useEffect(() => {
    if (positions.length > 0 && !analysis && !analysisLoading) runAnalysis()
  }, [positions.length])

  const runAnalysis = async () => {
    if (positions.length === 0) return
    setAnalysisLoading(true); setAnalysisError(null)
    try { setAnalysis(await analyzePortfolio(positions, { objective, beginnerMode: true })) }
    catch (err: unknown) { setAnalysisError(err instanceof Error ? err.message : 'Analysis failed') }
    finally { setAnalysisLoading(false) }
  }

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

  const activeMarket = selectedMarkets.length > 0 ? selectedMarkets[selectedMarkets.length - 1] : null

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-5 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
              <Shield size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-text-primary font-extrabold text-[18px] tracking-tight">
              Poly<span className="gradient-text">Hedge</span>
            </span>
          </div>
          <button
            onClick={() => { setLoggedIn(false); setAnalysis(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] text-text-muted hover:text-red hover:bg-red-bg transition-all duration-200 bg-transparent border-none cursor-pointer font-medium"
            aria-label="Log out"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 py-6">
        {/* Portfolio Hero */}
        {!loading && (
          <div className="hero-card p-7 mb-7 animate-fade-in-up">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div>
                <p className="text-white/50 text-[13px] font-medium mb-2 uppercase tracking-widest">
                  Portfolio Value
                </p>
                <p className="text-[44px] font-extrabold text-white tracking-tight leading-none tabular-nums animate-count-up">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <div
                  className={`flex items-center gap-2 mt-3 text-[15px] font-semibold tabular-nums ${
                    isPositive ? 'text-green' : 'text-red'
                  }`}
                >
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] ${
                    isPositive ? 'bg-green/20' : 'bg-red/20'
                  }`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
                  </div>
                  <span className="text-white/40 text-[13px]">
                    {isPositive ? '+' : ''}${totalGain.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Positions', value: positions.length, color: '#3B82F6' },
                  { label: 'Markets', value: markets.length, color: '#8B5CF6' },
                  { label: 'Bundles', value: bundles.length, color: '#10B981' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center px-4 py-3 rounded-xl min-w-[80px]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-white font-bold text-[22px] tabular-nums mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>
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
                <div className="flex items-center gap-2">
                  {(['hedge', 'amplify', 'explore'] as const).map((o) => (
                    <button key={o} onClick={() => setObjective(o)}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full border cursor-pointer capitalize transition-all duration-200 ${
                        objective === o ? 'bg-text-primary text-white border-text-primary' : 'bg-bg-card border-border text-text-secondary hover:border-text-muted'
                      }`}>{o}</button>
                  ))}
                  <button onClick={runAnalysis} disabled={analysisLoading || positions.length === 0}
                    className="btn-3d btn-3d-blue bg-blue text-white font-bold py-1.5 px-4 rounded-full text-[11px] disabled:opacity-30 cursor-pointer border-none">
                    <RefreshCw size={10} className={`inline mr-1 ${analysisLoading ? 'animate-spin' : ''}`} />
                    {analysisLoading ? 'Running' : 'Analyze'}
                  </button>
                </div>
              </div>
              {analysisLoading && !analysis && (
                <div className="card-static p-8 text-center">
                  <Loader2 size={28} className="animate-spin text-blue mx-auto mb-3" />
                  <p className="text-text-primary font-bold text-[15px]">Analyzing your portfolio...</p>
                  <p className="text-text-muted text-xs mt-1">Searching Polymarket, running K2Think AI</p>
                </div>
              )}
              {analysisError && (
                <div className="card-static p-5 text-center">
                  <p className="text-red text-sm font-semibold">{analysisError}</p>
                  <button onClick={runAnalysis} className="btn-3d btn-3d-blue bg-blue text-white font-semibold py-2 px-5 rounded-full text-[12px] cursor-pointer border-none mt-3">Try again</button>
                </div>
              )}
              {analysis && <AnalysisView analysis={analysis} />}
            </section>

            {/* Positions */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">
                Your Positions & Related Events
              </h2>
              <button
                onClick={() => setShowExplainer(true)}
                className="text-[13px] text-blue hover:text-purple bg-transparent border-none cursor-pointer font-semibold transition-colors duration-200"
              >
                What is hedging?
              </button>
            </div>

            {loading ? (
              <div className="space-y-3 stagger">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[76px]" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 stagger">
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
          <div className="space-y-5 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:sticky lg:top-[76px] scrollbar-thin">
            <div className="card-static overflow-hidden">
              {/* Event title */}
              <div className="px-5 pt-5 pb-3">
                {activeMarket ? (
                  <div className="animate-fade-in-scale">
                    <p className="text-[16px] font-bold text-text-primary leading-snug">
                      {activeMarket.title}
                    </p>
                    <p className="text-[12px] text-text-muted mt-1.5 font-medium">
                      {activeMarket.category} · <span className="tabular-nums">${(activeMarket.volume / 1_000_000).toFixed(1)}M</span> Vol.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mx-auto mb-3">
                      <BarChart3 size={20} className="text-text-muted" />
                    </div>
                    <p className="text-[14px] text-text-secondary font-semibold">
                      Select an event to trade
                    </p>
                    <p className="text-[12px] text-text-muted mt-1">
                      Click on a market from your positions
                    </p>
                  </div>
                )}
              </div>

              <div className="px-5 pb-5 space-y-5">
                {/* Buy / Sell tabs */}
                <div className="flex items-center border-b border-border">
                  {(['buy', 'sell'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTradeMode(mode)}
                      className={`text-[15px] bg-transparent border-none cursor-pointer transition-all duration-200 mr-5 pb-3 capitalize ${
                        tradeMode === mode
                          ? 'text-text-primary font-bold border-b-[3px] border-blue -mb-[1px]'
                          : 'text-text-muted font-medium hover:text-text-secondary'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                  <span className="ml-auto text-[13px] text-text-muted flex items-center gap-1 cursor-pointer hover:text-text-secondary transition-colors pb-3">
                    Market
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>

                {/* Outcome buttons */}
                {activeMarket && (
                  <div className="flex gap-3">
                    {(['yes', 'no'] as const).map((side) => {
                      const price = side === 'yes' ? activeMarket.confidence : 100 - activeMarket.confidence
                      return (
                        <button
                          key={side}
                          onClick={() => setTradeSide(side)}
                          className={`btn-3d flex-1 py-3.5 rounded-2xl text-[14px] font-bold cursor-pointer border-2 transition-all duration-150 capitalize ${
                            tradeSide === side
                              ? 'bg-white border-text-primary text-text-primary shadow-lg'
                              : 'bg-bg-input border-transparent text-text-muted hover:border-border-focus hover:text-text-secondary'
                          }`}
                        >
                          {side} <span className="tabular-nums">{price}¢</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[15px] text-text-primary font-semibold">Amount</span>
                    <span className={`text-[42px] font-extrabold tracking-tight tabular-nums leading-none transition-colors duration-200 ${tradeAmount > 0 ? 'text-text-primary' : 'text-border'}`}>
                      ${tradeAmount}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 5, 10, 100].map((v) => (
                      <button
                        key={v}
                        onClick={() => setTradeAmount((prev) => prev + v)}
                        className="btn-3d flex-1 text-[13px] font-semibold py-2.5 rounded-xl border border-border text-text-primary cursor-pointer bg-white hover:bg-bg-hover"
                      >
                        +${v}
                      </button>
                    ))}
                    <button
                      onClick={() => setTradeAmount(0)}
                      className="btn-3d text-[13px] font-semibold py-2.5 px-4 rounded-xl border border-border text-text-muted cursor-pointer bg-white hover:bg-bg-hover"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Trade button */}
                <button
                  onClick={async () => {
                    if (tradeAmount <= 0 || !activeMarket) return
                    setTrading(true)
                    await new Promise((r) => setTimeout(r, 800))
                    setTrading(false)
                    setTradeSuccess(true)
                    setTimeout(() => {
                      setTradeSuccess(false)
                      setTradeAmount(0)
                    }, 2000)
                  }}
                  disabled={tradeAmount <= 0 || !activeMarket || trading}
                  className={`btn-glow w-full text-white font-bold py-4 rounded-2xl text-[16px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none transition-all duration-200 ${
                    tradeSuccess ? 'animate-fade-in-scale' : ''
                  }`}
                  style={{
                    background: tradeSuccess
                      ? 'linear-gradient(135deg, #10B981, #059669)'
                      : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: tradeSuccess
                      ? '0 4px 0 0 #047857, 0 4px 20px rgba(16,185,129,0.3)'
                      : '0 4px 0 0 #1D4ED8, 0 4px 20px rgba(59,130,246,0.3)',
                  }}
                >
                  {trading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : tradeSuccess ? (
                    'Order placed!'
                  ) : (
                    'Trade'
                  )}
                </button>

                <p className="text-text-muted text-[11px] text-center">
                  By trading, you agree to the Terms of Use.
                </p>

                {/* Payoff diagram */}
                {activeMarket && (
                  <PayoffChart
                    probability={activeMarket.confidence}
                    amount={tradeAmount}
                    side={tradeSide}
                    mode={tradeMode}
                  />
                )}
              </div>
            </div>

            {/* P&L Payoff Surface */}
            {activeMarket && (
              <div className="card-static p-5">
                <PayoutHeatmap
                  probability={activeMarket.confidence}
                  side={tradeSide}
                />
              </div>
            )}

            {/* Hedge Builder */}
            <div className="card-static p-5 space-y-4">
              <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Shield size={13} className="text-purple" />
                Hedge Builder
              </h3>

              {selectedMarkets.length > 0 ? (
                <div className="space-y-2">
                  {selectedMarkets.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-[12px] py-2 px-3 rounded-xl bg-bg-page border border-border"
                    >
                      <span className="text-text-primary truncate flex-1 mr-3 font-medium">
                        {m.title}
                      </span>
                      <span className="text-green font-bold tabular-nums flex-shrink-0">
                        {m.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-[12px] text-center py-2">Select events to build a hedge bundle</p>
              )}

              {relatedStocks.length > 0 && (
                <div className="flex justify-between text-[12px] px-1">
                  <span className="text-text-muted">Related stocks</span>
                  <span className="text-text-primary font-bold">
                    {relatedStocks.map((s) => s.ticker).join(', ')}
                  </span>
                </div>
              )}

              <HedgeDial value={hedgePercent} onChange={setHedgePercent} />

              <input
                type="text"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="Bundle name..."
                className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-[13px] outline-none transition-all placeholder:text-text-muted"
              />

              <button
                onClick={handleSaveBundle}
                disabled={!bundleName.trim() || selectedMarkets.length === 0}
                className="btn-3d w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-[13px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none text-white"
                style={{ background: 'linear-gradient(135deg, #1E293B, #334155)' }}
              >
                <Plus size={15} />
                Save Bundle
              </button>
            </div>
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
