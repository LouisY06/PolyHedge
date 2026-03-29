import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, TrendingUp, TrendingDown, Plus, Package, Shield, BarChart3 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fetchPositions, fetchAllMarkets } from '../api/client'
import type { Bundle } from '../types'
import PositionRow from '../components/PositionRow'
import BundleCard from '../components/BundleCard'
import HedgeDial from '../components/HedgeDial'
import HedgeExplainerModal from '../components/HedgeExplainerModal'
import Skeleton from '../components/Skeleton'
import PortfolioChart from '../components/charts/PortfolioChart'
import AllocationDonut from '../components/charts/AllocationDonut'

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
  const totalGainPercent = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0
  const isPositive = totalGain >= 0
  const relatedStocks = positions.filter((p) => selectedMarkets.some((m) => m.relatedTickers.includes(p.ticker)))
  const activeMarket = selectedMarkets.length > 0 ? selectedMarkets[selectedMarkets.length - 1] : null

  const handleSaveBundle = () => {
    if (!bundleName.trim() || selectedMarkets.length === 0) return
    const bundle: Bundle = {
      id: crypto.randomUUID(), name: bundleName.trim(), stocks: relatedStocks,
      markets: [...selectedMarkets], hedgePercent, createdAt: new Date().toISOString(),
    }
    addBundle(bundle); setBundleName(''); clearSelections(); setHedgePercent(50)
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <motion.header
        className="bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-50"
        initial={{ y: -60 }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-[1200px] mx-auto px-5 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
              <Shield size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-text-primary font-extrabold text-[18px] tracking-tight">
              Poly<span className="gradient-text">Hedge</span>
            </span>
          </div>
          <motion.button
            onClick={() => setLoggedIn(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] text-text-muted hover:text-red hover:bg-red-bg transition-all bg-transparent border-none cursor-pointer font-medium"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          >
            <LogOut size={14} /><span className="hidden sm:inline">Log out</span>
          </motion.button>
        </div>
      </motion.header>

      <main className="max-w-[1200px] mx-auto px-5 py-6">
        {/* Portfolio Hero */}
        {!loading && (
          <motion.div
            className="hero-card p-7 mb-7"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div>
                <motion.p className="text-white/50 text-[13px] font-medium mb-2 uppercase tracking-widest"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  Portfolio Value
                </motion.p>
                <motion.p
                  className="text-[44px] font-extrabold text-white tracking-tight leading-none tabular-nums"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
                >
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </motion.p>
                <motion.div
                  className={`flex items-center gap-2 mt-3 text-[15px] font-semibold tabular-nums ${isPositive ? 'text-green' : 'text-red'}`}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                >
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] ${isPositive ? 'bg-green/20' : 'bg-red/20'}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isPositive ? '+' : ''}{totalGainPercent.toFixed(2)}%
                  </div>
                  <span className="text-white/40 text-[13px]">{isPositive ? '+' : ''}${totalGain.toFixed(2)}</span>
                </motion.div>
              </div>
            </div>

            {/* Portfolio sparkline */}
            <PortfolioChart />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between mt-4 gap-3">
              <div />
              <div className="flex items-center gap-3">
                {[
                  { label: 'Positions', value: positions.length },
                  { label: 'Markets', value: markets.length },
                  { label: 'Bundles', value: bundles.length },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="text-center px-4 py-3 rounded-xl min-w-[80px]"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.12)' }}
                  >
                    <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-white font-bold text-[22px] tabular-nums mt-0.5">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Portfolio Allocation */}
        {!loading && positions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
            <motion.div className="card-static p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-4">Portfolio Allocation</h3>
              <AllocationDonut positions={positions} />
            </motion.div>
            <motion.div className="card-static p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-4">Top Movers</h3>
              <div className="space-y-3">
                {[...positions].sort((a, b) => Math.abs(b.gainLossPercent) - Math.abs(a.gainLossPercent)).slice(0, 4).map((p, i) => (
                  <motion.div key={p.ticker} className="flex items-center justify-between"
                    initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.08 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                        {p.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-text-primary">{p.ticker}</p>
                        <p className="text-[11px] text-text-muted">${p.currentPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-[60px] h-[4px] rounded-full bg-bg-input overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: p.gainLossPercent >= 0 ? '#22C55E' : '#EF4444' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.abs(p.gainLossPercent), 100)}%` }}
                          transition={{ delay: 0.9 + i * 0.1, duration: 0.6 }}
                        />
                      </div>
                      <span className={`text-[12px] font-bold tabular-nums ${p.gainLossPercent >= 0 ? 'text-green' : 'text-red'}`}>
                        {p.gainLossPercent >= 0 ? '+' : ''}{p.gainLossPercent.toFixed(1)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Positions */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Your Positions & Related Events</h2>
              <motion.button
                onClick={() => setShowExplainer(true)}
                className="text-[13px] text-blue bg-transparent border-none cursor-pointer font-semibold"
                whileHover={{ scale: 1.05, color: '#8B5CF6' }} whileTap={{ scale: 0.95 }}
              >
                What is hedging?
              </motion.button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-[76px]" />))}
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos, i) => (
                  <motion.div
                    key={pos.ticker}
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <PositionRow position={pos} markets={markets.filter((m) => m.relatedTickers.includes(pos.ticker))} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Trade Panel */}
          <div className="space-y-5">
            <motion.div
              className="card-static sticky top-[76px] overflow-hidden"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Event title */}
              <div className="px-5 pt-5 pb-3">
                <AnimatePresence mode="wait">
                  {activeMarket ? (
                    <motion.div key={activeMarket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                      <p className="text-[16px] font-bold text-text-primary leading-snug">{activeMarket.title}</p>
                      <p className="text-[12px] text-text-muted mt-1.5 font-medium">{activeMarket.category} · <span className="tabular-nums">${(activeMarket.volume / 1_000_000).toFixed(1)}M</span> Vol.</p>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mx-auto mb-3"
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <BarChart3 size={20} className="text-text-muted" />
                      </motion.div>
                      <p className="text-[14px] text-text-secondary font-semibold">Select an event to trade</p>
                      <p className="text-[12px] text-text-muted mt-1">Click on a market from your positions</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-5 pb-5 space-y-5">
                {/* Buy / Sell tabs */}
                <div className="flex items-center border-b border-border">
                  {(['buy', 'sell'] as const).map((mode) => (
                    <button key={mode} onClick={() => setTradeMode(mode)}
                      className={`text-[15px] bg-transparent border-none cursor-pointer transition-all duration-200 mr-5 pb-3 capitalize relative ${tradeMode === mode ? 'text-text-primary font-bold' : 'text-text-muted font-medium hover:text-text-secondary'}`}
                    >
                      {mode}
                      {tradeMode === mode && (
                        <motion.div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue rounded-full" layoutId="trade-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                      )}
                    </button>
                  ))}
                  <span className="ml-auto text-[13px] text-text-muted flex items-center gap-1 cursor-pointer pb-3">
                    Market <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>

                {/* Outcome buttons */}
                {activeMarket && (
                  <div className="flex gap-3">
                    {(['yes', 'no'] as const).map((side) => {
                      const price = side === 'yes' ? activeMarket.confidence : 100 - activeMarket.confidence
                      return (
                        <motion.button key={side} onClick={() => setTradeSide(side)}
                          className={`flex-1 py-3.5 rounded-2xl text-[14px] font-bold cursor-pointer border-2 capitalize ${tradeSide === side ? 'bg-white border-text-primary text-text-primary' : 'bg-bg-input border-transparent text-text-muted hover:border-border-focus hover:text-text-secondary'}`}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          style={tradeSide === side ? { boxShadow: '0 4px 0 0 rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.06)' } : {}}
                        >
                          {side} <span className="tabular-nums">{price}¢</span>
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-[15px] text-text-primary font-semibold">Amount</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={tradeAmount}
                        className={`text-[42px] font-extrabold tracking-tight tabular-nums leading-none ${tradeAmount > 0 ? 'text-text-primary' : 'text-border'}`}
                        initial={{ opacity: 0, y: -10, scale: 1.1 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                      >
                        ${tradeAmount}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="flex gap-2">
                    {[1, 5, 10, 100].map((v) => (
                      <motion.button key={v} onClick={() => setTradeAmount((prev) => prev + v)}
                        className="btn-3d flex-1 text-[13px] font-semibold py-2.5 rounded-xl border border-border text-text-primary cursor-pointer bg-white"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                      >
                        +${v}
                      </motion.button>
                    ))}
                    <motion.button onClick={() => setTradeAmount(0)}
                      className="btn-3d text-[13px] font-semibold py-2.5 px-4 rounded-xl border border-border text-text-muted cursor-pointer bg-white"
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                    >
                      Max
                    </motion.button>
                  </div>
                </div>

                {/* Trade button */}
                <motion.button
                  onClick={async () => {
                    if (tradeAmount <= 0 || !activeMarket) return
                    setTrading(true)
                    await new Promise((r) => setTimeout(r, 800))
                    setTrading(false); setTradeSuccess(true)
                    setTimeout(() => { setTradeSuccess(false); setTradeAmount(0) }, 2000)
                  }}
                  disabled={tradeAmount <= 0 || !activeMarket || trading}
                  className="btn-glow w-full text-white font-bold py-4 rounded-2xl text-[16px] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none"
                  style={{
                    background: tradeSuccess ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: tradeSuccess ? '0 4px 0 0 #047857, 0 4px 20px rgba(16,185,129,0.3)' : '0 4px 0 0 #1D4ED8, 0 4px 20px rgba(59,130,246,0.3)',
                  }}
                  whileHover={{ y: 2, boxShadow: tradeSuccess ? '0 2px 0 0 #047857' : '0 2px 0 0 #1D4ED8, 0 2px 10px rgba(59,130,246,0.2)' }}
                  whileTap={{ y: 4, boxShadow: '0 0 0 0 transparent' }}
                >
                  {trading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                      Processing...
                    </span>
                  ) : tradeSuccess ? (
                    <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                      Order placed!
                    </motion.span>
                  ) : 'Trade'}
                </motion.button>

                <p className="text-text-muted text-[11px] text-center">By trading, you agree to the Terms of Use.</p>
              </div>
            </motion.div>

            {/* Hedge Builder */}
            <motion.div className="card-static p-5 space-y-4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
              <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Shield size={13} className="text-purple" /> Hedge Builder
              </h3>

              <AnimatePresence>
                {selectedMarkets.length > 0 ? (
                  <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {selectedMarkets.map((m) => (
                      <motion.div key={m.id} className="flex items-center justify-between text-[12px] py-2 px-3 rounded-xl bg-bg-page border border-border"
                        initial={{ opacity: 0, x: -20, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, x: 20, height: 0 }}
                        layout transition={{ duration: 0.25 }}
                      >
                        <span className="text-text-primary truncate flex-1 mr-3 font-medium">{m.title}</span>
                        <span className="text-green font-bold tabular-nums flex-shrink-0">{m.confidence}%</span>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <p className="text-text-muted text-[12px] text-center py-2">Select events to build a hedge bundle</p>
                )}
              </AnimatePresence>

              {relatedStocks.length > 0 && (
                <div className="flex justify-between text-[12px] px-1">
                  <span className="text-text-muted">Related stocks</span>
                  <span className="text-text-primary font-bold">{relatedStocks.map((s) => s.ticker).join(', ')}</span>
                </div>
              )}

              <HedgeDial value={hedgePercent} onChange={setHedgePercent} />

              <input type="text" value={bundleName} onChange={(e) => setBundleName(e.target.value)}
                placeholder="Bundle name..." className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-[13px] outline-none transition-all placeholder:text-text-muted" />

              <motion.button onClick={handleSaveBundle}
                disabled={!bundleName.trim() || selectedMarkets.length === 0}
                className="btn-3d w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-[13px] disabled:opacity-30 cursor-pointer border-none text-white"
                style={{ background: 'linear-gradient(135deg, #1E293B, #334155)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              >
                <Plus size={15} /> Save Bundle
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* Saved Bundles */}
        {bundles.length > 0 && (
          <motion.section className="mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <h2 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package size={14} className="text-purple" /> Saved Bundles
            </h2>
            <div className="space-y-3">
              {bundles.map((bundle) => (<BundleCard key={bundle.id} bundle={bundle} />))}
            </div>
          </motion.section>
        )}
      </main>

      <AnimatePresence>
        {showExplainer && <HedgeExplainerModal onClose={() => setShowExplainer(false)} />}
      </AnimatePresence>
    </div>
  )
}
