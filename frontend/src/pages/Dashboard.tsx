import { useEffect, useState } from 'react'
import { LogOut, TrendingUp, TrendingDown, Shield, Plus, Package } from 'lucide-react'
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
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-accent-blue" />
            <span className="text-text-primary font-bold text-lg tracking-tight">
              PolyHedge
            </span>
          </div>
          <button
            onClick={() => setLoggedIn(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-accent-red hover:bg-bg-hover transition-colors bg-transparent border-none cursor-pointer"
            aria-label="Log out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Portfolio Summary KPIs */}
        {!loading && (
          <section className="mb-8" aria-label="Portfolio summary">
            <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-text-secondary text-sm font-medium mb-1">
                    Portfolio Value
                  </p>
                  <p className="text-4xl font-bold text-text-primary tracking-tight">
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <div
                    className={`flex items-center gap-1.5 mt-1.5 text-sm font-semibold ${
                      isPositive ? 'text-accent-green' : 'text-accent-red'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )}
                    {isPositive ? '+' : ''}${totalGain.toFixed(2)} (
                    {isPositive ? '+' : ''}
                    {totalGainPercent.toFixed(2)}%)
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-bg-primary rounded-xl px-4 py-2 text-center">
                    <p className="text-text-muted text-xs">Positions</p>
                    <p className="text-text-primary font-bold text-lg">
                      {positions.length}
                    </p>
                  </div>
                  <div className="bg-bg-primary rounded-xl px-4 py-2 text-center">
                    <p className="text-text-muted text-xs">Markets</p>
                    <p className="text-text-primary font-bold text-lg">
                      {markets.length}
                    </p>
                  </div>
                  <div className="bg-bg-primary rounded-xl px-4 py-2 text-center">
                    <p className="text-text-muted text-xs">Bundles</p>
                    <p className="text-text-primary font-bold text-lg">
                      {bundles.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Positions + Markets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Positions with related markets */}
            <section aria-label="Portfolio positions">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  Your Positions & Related Events
                </h2>
                <button
                  onClick={() => setShowExplainer(true)}
                  className="text-xs text-accent-blue hover:underline bg-transparent border-none cursor-pointer font-medium"
                >
                  What is hedging?
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
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
            </section>
          </div>

          {/* Right: Hedge Builder panel */}
          <div>
            <section aria-label="Hedge builder">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                Hedge Builder
              </h2>
              <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-5 sticky top-20 shadow-sm">
                <div>
                  <label
                    htmlFor="bundle-name"
                    className="block text-text-primary text-xs font-semibold mb-1.5"
                  >
                    Bundle Name
                  </label>
                  <input
                    id="bundle-name"
                    type="text"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    placeholder="e.g. Tech Hedge Q2"
                    className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue-light transition-all"
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Events selected</span>
                    <span className="text-text-primary font-semibold">
                      {selectedMarkets.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Related stocks</span>
                    <span className="text-text-primary font-semibold">
                      {relatedStocks.length > 0
                        ? relatedStocks.map((s) => s.ticker).join(', ')
                        : '—'}
                    </span>
                  </div>
                </div>

                <HedgeDial value={hedgePercent} onChange={setHedgePercent} />

                <button
                  onClick={handleSaveBundle}
                  disabled={!bundleName.trim() || selectedMarkets.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-accent-blue text-white font-semibold py-3 rounded-xl text-sm hover:bg-accent-blue/90 transition-colors disabled:opacity-30 cursor-pointer border-none focus:ring-2 focus:ring-accent-blue-light focus:outline-none"
                >
                  <Plus size={16} />
                  Save Bundle
                </button>

                {selectedMarkets.length === 0 && (
                  <p className="text-text-muted text-xs text-center">
                    Select events from your positions to build a hedge
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Saved Bundles */}
        {bundles.length > 0 && (
          <section className="mt-8" aria-label="Saved bundles">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package size={14} />
              Saved Bundles
            </h2>
            <div className="space-y-4">
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
