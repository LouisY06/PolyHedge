import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import type { Position, Market } from '../types'
import { useStore } from '../store/useStore'
import { fetchChart, type ChartPoint } from '../api/client'

interface Props {
  position: Position
  markets: Market[]
}

export default function PositionRow({ position, markets }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = position.gainLoss >= 0
  const selectedMarkets = useStore((s) => s.selectedMarkets)
  const toggleMarketSelection = useStore((s) => s.toggleMarketSelection)

  const [chartPoints, setChartPoints] = useState<ChartPoint[] | null>(null)

  useEffect(() => {
    fetchChart(position.ticker).then((d) => {
      if (d?.points?.length) setChartPoints(d.points)
    })
  }, [position.ticker])

  return (
    <div className="card overflow-visible">
      {/* Stock header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-bg-hover transition-all duration-200 bg-transparent border-none text-left group"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[13px] text-white" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
            {position.ticker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-primary text-[15px]">
                {position.ticker}
              </span>
              <span className="text-text-muted text-[12px] hidden sm:inline font-medium">
                {position.name}
              </span>
            </div>
            <p className="text-text-muted text-[12px] mt-0.5">
              {position.shares} share{position.shares !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-1 mx-5 hidden sm:block" onClick={(e) => e.stopPropagation()}>
          {chartPoints ? (
            <Sparkline points={chartPoints} positive={isPositive} />
          ) : (
            <div className="h-[48px] flex items-center">
              <div className={`h-[2px] w-full rounded-full ${isPositive ? 'bg-green/20' : 'bg-red/20'}`} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <p className="text-text-primary font-bold text-[16px] tabular-nums">
              ${position.currentPrice.toFixed(2)}
            </p>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums mt-0.5 ${
              isPositive ? 'text-green bg-green-bg' : 'text-red bg-red-bg'
            }`}>
              {isPositive ? <TrendingUpMini /> : <TrendingDownMini />}
              {isPositive ? '+' : ''}{position.gainLossPercent.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            {markets.length > 0 && (
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                {markets.length}
              </span>
            )}
            <div className={`text-text-muted transition-transform duration-300 ease-out ${expanded ? 'rotate-180' : ''} group-hover:text-text-secondary`}>
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded: stats + related markets */}
      {expanded && (
        <div className="border-t border-border animate-slide-down">
          {/* Position stats */}
          <div className="px-5 py-3 flex gap-6 text-xs">
            <Stat label="Market Value" value={`$${position.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Stat label="Avg Cost" value={`$${position.avgCost.toFixed(2)}`} />
            <Stat label="Total Return" value={`${isPositive ? '+' : ''}$${position.gainLoss.toFixed(2)}`} color={isPositive ? 'text-green' : 'text-red'} />
          </div>

          {markets.length === 0 ? (
            <div className="py-10 text-center border-t border-border">
              <p className="text-text-muted text-[13px]">No related markets found</p>
            </div>
          ) : (
            <div>
              {markets.map((market) => {
                const isSelected = selectedMarkets.some((m) => m.id === market.id)
                const endDate = new Date(market.endDate)
                const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))

                return (
                  <div
                    key={market.id}
                    className={`flex items-center gap-4 px-5 py-4 transition-all duration-200 cursor-pointer border-t border-border ${
                      isSelected ? 'bg-blue-bg/60' : 'hover:bg-bg-hover'
                    }`}
                    onClick={() => toggleMarketSelection(market)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMarketSelection(market) }
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isSelected ? 'border-blue scale-110' : 'border-border hover:border-text-muted'
                      }`}
                      style={isSelected ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)' } : {}}
                    >
                      {isSelected && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary leading-snug">{market.title}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-text-muted flex items-center gap-1 font-medium"><Clock size={10} />{daysLeft}d left</span>
                        <span className="text-[11px] text-text-muted tabular-nums font-medium">${(market.volume / 1_000_000).toFixed(1)}M vol</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="btn-3d btn-3d-green flex flex-col items-center justify-center w-[56px] h-[44px] rounded-xl cursor-pointer" style={{ background: 'linear-gradient(180deg, #F0FDF4, #DCFCE7)' }}>
                        <span className="text-green text-[14px] font-extrabold leading-none tabular-nums">{market.confidence}¢</span>
                        <span className="text-green/60 text-[9px] font-bold mt-0.5 uppercase tracking-wider">Yes</span>
                      </div>
                      <div className="btn-3d btn-3d-red flex flex-col items-center justify-center w-[56px] h-[44px] rounded-xl cursor-pointer" style={{ background: 'linear-gradient(180deg, #FEF2F2, #FEE2E2)' }}>
                        <span className="text-red text-[14px] font-extrabold leading-none tabular-nums">{100 - market.confidence}¢</span>
                        <span className="text-red/60 text-[9px] font-bold mt-0.5 uppercase tracking-wider">No</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-text-muted text-[10px] font-medium mb-0.5">{label}</p>
      <p className={`font-semibold tabular-nums ${color || 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

function TrendingUpMini() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 7L4 4L6 6L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 3H9V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrendingDownMini() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 3L4 6L6 4L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7H9V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Sparkline with Robinhood-style hover ─────

function Sparkline({ points, positive }: { points: ChartPoint[]; positive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ pct: number; price: number; time: number; y: number } | null>(null)
  const color = positive ? '#10B981' : '#EF4444'

  const H = 48
  const pad = 6
  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const toY = (p: number) => pad + (1 - (p - min) / range) * (H - pad * 2)

  const svgPath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${((i / (points.length - 1)) * 100).toFixed(2)},${toY(p.price).toFixed(1)}`
  ).join(' ')

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const idx = Math.round(pct * (points.length - 1))
    const pt = points[idx]
    if (pt) setHover({ pct: pct * 100, price: pt.price, time: pt.time, y: toY(pt.price) })
  }, [points, min, range])

  return (
    <div ref={containerRef} className="relative cursor-crosshair" style={{ height: H }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 100 ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
        <path d={svgPath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>

      {hover && (
        <>
          {/* Vertical line */}
          <div className="absolute top-0 pointer-events-none"
            style={{ left: `${hover.pct}%`, height: H, width: 1, backgroundColor: color, opacity: 0.4 }} />
          {/* Dot */}
          <div className="absolute pointer-events-none"
            style={{
              left: `${hover.pct}%`, top: hover.y,
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: color, border: '2px solid white',
              boxShadow: `0 0 0 1.5px ${color}`,
              transform: 'translate(-50%, -50%)',
            }} />
          {/* Tooltip */}
          <div className="absolute px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none z-10"
            style={{
              left: `${Math.max(10, Math.min(90, hover.pct))}%`,
              top: H + 6,
              transform: 'translateX(-50%)',
              background: '#111827', color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
            ${hover.price.toFixed(2)} &middot; {new Date(hover.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </>
      )}
    </div>
  )
}
