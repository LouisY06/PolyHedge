import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight, Clock } from 'lucide-react'
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
  const [sparkHover, setSparkHover] = useState(false)

  useEffect(() => {
    fetchChart(position.ticker).then((d) => {
      if (d?.points?.length) setChartPoints(d.points)
    })
  }, [position.ticker])

  return (
    <div className={`relative ${sparkHover ? 'z-30' : ''}`}>
      {/* Main row — Robinhood style: flat, no card border, divider only */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center px-0 py-3 cursor-pointer bg-transparent border-none text-left group"
        style={{ overflow: 'visible' }}
        aria-expanded={expanded}
      >
        {/* Ticker + name */}
        <div className="w-[140px] flex-shrink-0">
          <span className="font-medium text-text-primary text-[15px] block leading-tight">
            {position.ticker}
          </span>
          <span className="text-text-muted text-[13px] block mt-0.5">
            {position.shares} share{position.shares !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Sparkline */}
        <div className="flex-1 mx-6 hidden sm:block" style={{ overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
          {chartPoints ? (
            <Sparkline points={chartPoints} positive={isPositive} onHoverChange={setSparkHover} />
          ) : (
            <div className="h-[40px] flex items-center">
              <div className={`h-px w-full ${isPositive ? 'bg-green/30' : 'bg-red/30'}`} />
            </div>
          )}
        </div>

        {/* Price + change */}
        <div className="flex-shrink-0 text-right">
          <p className="text-text-primary font-medium text-[15px] tabular-nums leading-tight">
            ${position.currentPrice.toFixed(2)}
          </p>
          <p className={`text-[13px] tabular-nums mt-0.5 ${
            isPositive ? 'text-green' : 'text-red'
          }`}>
            {isPositive ? '+' : ''}{position.gainLossPercent.toFixed(2)}%
          </p>
        </div>

        {/* Chevron */}
        <div className={`ml-4 text-text-muted/40 transition-transform duration-200 ease-out flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}>
          <ChevronRight size={14} />
        </div>
      </button>

      {/* Divider */}
      <div className="h-px bg-black/[0.04]" />

      {/* Expanded section */}
      {expanded && (
        <div className="animate-slide-down">
          {/* Stats row */}
          <div className="py-4 flex gap-6">
            <Stat label="Market Value" value={`$${position.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Stat label="Avg Cost" value={`$${position.avgCost.toFixed(2)}`} />
            <Stat label="Total Return" value={`${isPositive ? '+' : ''}$${position.gainLoss.toFixed(2)}`} color={isPositive ? 'text-green' : 'text-red'} />
          </div>

          {/* Related markets */}
          {markets.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-text-muted text-[13px]">No related markets</p>
            </div>
          ) : (
            <div className="pb-2">
              <p className="text-text-muted text-[11px] font-medium uppercase tracking-wider mb-2">Related Markets</p>
              {markets.map((market) => {
                const isSelected = selectedMarkets.some((m) => m.id === market.id)
                const endDate = new Date(market.endDate)
                const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))

                return (
                  <div
                    key={market.id}
                    className={`flex items-center gap-3 py-3 cursor-pointer transition-colors duration-150 -mx-1 px-1 rounded-lg ${
                      isSelected ? 'bg-green/[0.04]' : 'hover:bg-black/[0.02]'
                    }`}
                    onClick={() => toggleMarketSelection(market)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMarketSelection(market) }
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                        isSelected ? 'bg-green border-green' : 'border-black/15'
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Market info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary leading-snug">{market.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-text-muted flex items-center gap-0.5"><Clock size={9} />{daysLeft}d</span>
                        <span className="text-[11px] text-text-muted tabular-nums">${(market.volume / 1_000_000).toFixed(1)}M</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 tabular-nums">
                      <span className="text-green text-[13px] font-medium">{market.confidence}¢</span>
                      <span className="text-text-muted/40 text-[11px] mx-0.5">/</span>
                      <span className="text-red text-[13px] font-medium">{100 - market.confidence}¢</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="h-px bg-black/[0.04]" />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-text-muted text-[11px] mb-0.5">{label}</p>
      <p className={`text-[13px] font-medium tabular-nums ${color || 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

// ── Sparkline ─────

function Sparkline({ points, positive, onHoverChange }: { points: ChartPoint[]; positive: boolean; onHoverChange?: (hovering: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ pct: number; price: number; time: number; y: number } | null>(null)
  const color = positive ? '#00C805' : '#FF5000'

  const H = 40
  const pad = 4
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
    <div ref={containerRef} className="relative" style={{ height: H, overflow: 'visible', cursor: 'default' }}
      onMouseMove={onMove} onMouseEnter={() => onHoverChange?.(true)} onMouseLeave={() => { setHover(null); onHoverChange?.(false) }}>
      <svg viewBox={`0 0 100 ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
        <path d={svgPath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>

      {hover && (
        <>
          {/* Vertical line */}
          <div className="absolute top-0 pointer-events-none"
            style={{ left: `${hover.pct}%`, height: H, width: 1, backgroundColor: color, opacity: 0.3 }} />
          {/* Dot */}
          <div className="absolute pointer-events-none"
            style={{
              left: `${hover.pct}%`, top: hover.y,
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: color, border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              transform: 'translate(-50%, -50%)',
            }} />
          {/* Tooltip */}
          <div className="absolute px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap pointer-events-none z-50"
            style={{
              left: `${Math.max(10, Math.min(90, hover.pct))}%`,
              top: H + 4,
              transform: 'translateX(-50%)',
              background: '#1a1a1a', color: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
            ${hover.price.toFixed(2)} &middot; {new Date(hover.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </>
      )}
    </div>
  )
}
