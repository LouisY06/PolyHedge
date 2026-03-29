import { useState } from 'react'
import { BarChart3, Loader2, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import type { BacktestResult, Position, SelectedMarket } from '../types'
import { runBacktest } from '../api/client'

interface Props {
  positions: Position[]
  markets: SelectedMarket[]
}

export default function BacktestSection({ positions, markets }: Props) {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (positions.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const data = await runBacktest(positions, markets)
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">
          Hedge Backtest
        </h2>
        <button
          onClick={handleRun}
          disabled={loading || positions.length === 0}
          className="text-[11px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer disabled:opacity-30 transition-colors duration-150 flex items-center gap-1"
        >
          {loading ? (
            <><Loader2 size={10} className="animate-spin" /> Running...</>
          ) : result ? (
            <><RefreshCw size={10} /> Re-run</>
          ) : (
            <><BarChart3 size={10} /> Run Backtest</>
          )}
        </button>
      </div>

      {/* Initial state */}
      {!result && !loading && !error && (
        <div className="py-8 text-center">
          <BarChart3 size={20} className="text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-text-muted text-[13px]">
            Run a backtest to see how your hedges would have performed
          </p>
          <button
            onClick={handleRun}
            disabled={positions.length === 0 || markets.length === 0}
            className="mt-3 text-[12px] font-medium text-text-primary bg-transparent border border-border rounded-lg px-4 py-2 cursor-pointer hover:bg-bg-hover transition-colors disabled:opacity-30"
          >
            Run Backtest
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center">
          <Loader2 size={16} className="animate-spin text-text-muted mx-auto mb-2" />
          <p className="text-text-muted text-[13px]">Running backtest (this may take 15-30s)...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-6 text-center">
          <p className="text-red text-[13px]">{error}</p>
          <button onClick={handleRun} className="text-[12px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-bg/50 rounded-lg px-4 py-3">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Max Drawdown Reduction</p>
              <p className="text-[18px] font-semibold text-green flex items-center gap-1">
                <TrendingDown size={14} />
                {result.summary.maxDrawdownReduction}
              </p>
            </div>
            <div className="bg-blue-bg/50 rounded-lg px-4 py-3">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Risk-Adjusted Improvement</p>
              <p className="text-[18px] font-semibold text-blue flex items-center gap-1">
                <TrendingUp size={14} />
                {result.summary.riskAdjustedImprovement}
              </p>
            </div>
          </div>

          {/* Backtest chart */}
          {result.backtest.dates.length > 0 && (
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Portfolio Value (6 months)</p>
              <BacktestChart data={result.backtest} />
              <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-text-muted inline-block" /> Portfolio only
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-green inline-block" /> With hedges
                </span>
              </div>
            </div>
          )}

          {/* Hedge effectiveness table */}
          {result.hedgeEffectiveness.length > 0 && (
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Hedge Effectiveness</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[4rem_1fr_4.5rem_4rem] gap-2 px-3 py-2 text-[10px] text-text-muted uppercase tracking-wider bg-bg-hover/50 border-b border-border">
                  <span>Stock</span>
                  <span>Market</span>
                  <span className="text-right">Corr.</span>
                  <span className="text-right">Score</span>
                </div>
                {result.hedgeEffectiveness.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[4rem_1fr_4.5rem_4rem] gap-2 px-3 py-2.5 text-[12px] border-b border-border last:border-b-0"
                    title={row.explanation}
                  >
                    <span className="font-semibold text-text-primary">{row.ticker}</span>
                    <span className="text-text-secondary truncate">{row.marketTitle}</span>
                    <span className="text-right tabular-nums text-text-primary">
                      {row.correlation.toFixed(2)}
                    </span>
                    <span className={`text-right font-medium ${
                      row.score === 'Strong' ? 'text-green' :
                      row.score === 'Moderate' ? 'text-blue' :
                      row.score === 'Weak' ? 'text-text-muted' : 'text-red'
                    }`}>
                      {row.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best/worst hedge */}
          <div className="text-[12px] text-text-secondary">
            <p>Best hedge: <span className="text-text-primary font-medium">{result.summary.bestHedge}</span></p>
            <p>Weakest hedge: <span className="text-text-primary font-medium">{result.summary.worstHedge}</span></p>
          </div>
        </div>
      )}
    </section>
  )
}

function BacktestChart({ data }: { data: { dates: string[]; portfolioOnly: number[]; portfolioWithHedge: number[] } }) {
  const W = 560
  const H = 160
  const PAD = 20

  const allValues = [...data.portfolioOnly, ...data.portfolioWithHedge]
  const min = Math.min(...allValues) * 0.98
  const max = Math.max(...allValues) * 1.02
  const n = data.dates.length

  const toX = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD)
  const toY = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD)

  const makePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      {[0.25, 0.5, 0.75].map((pct) => (
        <line key={pct} x1={PAD} x2={W - PAD} y1={toY(min + pct * (max - min))} y2={toY(min + pct * (max - min))} stroke="#E8E8E8" strokeWidth={0.5} />
      ))}
      <path d={makePath(data.portfolioOnly)} fill="none" stroke="#9B9B9B" strokeWidth={1.5} />
      <path d={makePath(data.portfolioWithHedge)} fill="none" stroke="#00C805" strokeWidth={1.5} />
      {data.dates.map((d, i) => (
        i % Math.max(1, Math.floor(n / 6)) === 0 ? (
          <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="#9B9B9B">{d}</text>
        ) : null
      ))}
    </svg>
  )
}
