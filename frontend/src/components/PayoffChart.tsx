import { useState, useRef, useCallback } from 'react'

interface Props {
  /** Current YES probability 0–100 (i.e. price in cents) */
  probability: number
  /** Dollar amount the user wants to invest */
  amount: number
  /** Which side: 'yes' or 'no' */
  side: 'yes' | 'no'
  /** 'buy' or 'sell' */
  mode: 'buy' | 'sell'
}

/**
 * Payoff diagram for a binary prediction-market event.
 *
 * X-axis  = outcome probability at resolution (0 → 100%)
 * Y-axis  = P&L in dollars
 *
 * For BUY YES at price p (cents/100):
 *   shares = amount / p
 *   If resolves YES → profit = shares × (1 - p)   = amount × (1-p)/p
 *   If resolves NO  → loss   = -amount
 *
 * For BUY NO at price (1-p):
 *   shares = amount / (1-p)
 *   If resolves NO  → profit = shares × p          = amount × p/(1-p)
 *   If resolves YES → loss   = -amount
 *
 * We also show a continuous P&L line as probability moves from 0→100,
 * representing how the mark-to-market value changes.
 */
export default function PayoffChart({ probability, amount, side, mode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; prob: number; pnl: number } | null>(null)

  const p = Math.max(1, Math.min(99, probability)) / 100 // clamp to avoid /0

  // Shares purchased
  const costPerShare = side === 'yes' ? p : 1 - p
  const shares = amount > 0 ? amount / costPerShare : 0

  // P&L at each outcome probability (mark-to-market)
  // As probability moves, the value of YES shares = prob, NO shares = (1-prob)
  const pnlAtProb = (prob: number): number => {
    if (amount <= 0) return 0
    const currentValue = side === 'yes' ? shares * prob : shares * (1 - prob)
    const invested = amount
    return mode === 'buy' ? currentValue - invested : invested - currentValue
  }

  // Key P&L values
  const maxProfit = pnlAtProb(side === 'yes' ? 1 : 0)
  const maxLoss = pnlAtProb(side === 'yes' ? 0 : 1)
  const breakeven = probability

  // Chart dimensions
  const W = 280
  const H = 140
  const padL = 44
  const padR = 12
  const padT = 16
  const padB = 28
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Y range: include 0 line, maxProfit, maxLoss
  const yVals = [maxProfit, maxLoss, 0]
  const yMax = Math.max(...yVals) * 1.15 || 10
  const yMin = Math.min(...yVals) * 1.15 || -10

  const toX = (prob01: number) => padL + prob01 * chartW
  const toY = (val: number) => padT + (1 - (val - yMin) / (yMax - yMin || 1)) * chartH
  const zeroY = toY(0)

  // Build path: 100 sample points
  const STEPS = 100
  const pathPoints: string[] = []
  for (let i = 0; i <= STEPS; i++) {
    const prob01 = i / STEPS
    const val = pnlAtProb(prob01)
    const x = toX(prob01).toFixed(1)
    const y = toY(val).toFixed(1)
    pathPoints.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }

  // Fill areas: profit (above 0) and loss (below 0)
  // Profit fill: path + close along zero line
  const profitFill = [...pathPoints, `L${toX(1).toFixed(1)},${zeroY.toFixed(1)}`, `L${toX(0).toFixed(1)},${zeroY.toFixed(1)}`, 'Z'].join(' ')
  // We'll use clipPath to separate profit/loss regions

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const rawX = e.clientX - rect.left
    const rawProb = Math.max(0, Math.min(1, (rawX - padL) / chartW))
    // Snap to nearest whole percent so tooltip values are clean
    const prob01 = Math.round(rawProb * 100) / 100
    const pnl = pnlAtProb(prob01)
    setHover({ x: rawX, prob: prob01 * 100, pnl })
  }, [amount, probability, side, mode])

  const formatDollar = (v: number) => {
    const abs = Math.abs(v)
    if (abs >= 1000) return `${v < 0 ? '-' : '+'}$${(abs / 1000).toFixed(1)}k`
    return `${v < 0 ? '-' : v > 0 ? '+' : ''}$${abs.toFixed(2)}`
  }

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Payoff Diagram</span>
        {amount > 0 && (
          <span className="text-[10px] text-text-muted font-medium tabular-nums">
            {shares.toFixed(1)} shares @ {(costPerShare * 100).toFixed(0)}¢
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative bg-bg-page rounded-xl border border-border overflow-hidden cursor-crosshair"
        style={{ height: H }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {amount <= 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-[12px] font-medium">
            Enter an amount to see payoff
          </div>
        ) : (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            {/* Clip paths for profit/loss coloring */}
            <defs>
              <clipPath id="above-zero">
                <rect x={padL} y={padT} width={chartW} height={Math.max(0, zeroY - padT)} />
              </clipPath>
              <clipPath id="below-zero">
                <rect x={padL} y={zeroY} width={chartW} height={Math.max(0, padT + chartH - zeroY)} />
              </clipPath>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((frac) => (
              <line key={frac} x1={toX(frac)} y1={padT} x2={toX(frac)} y2={padT + chartH}
                stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3" />
            ))}

            {/* Zero line */}
            <line x1={padL} y1={zeroY} x2={padL + chartW} y2={zeroY}
              stroke="#9CA3AF" strokeWidth="1.5" />

            {/* Profit fill (green, above zero) */}
            <path d={profitFill} fill="#10B981" opacity="0.1" clipPath="url(#above-zero)" />

            {/* Loss fill (red, below zero) */}
            <path d={profitFill} fill="#EF4444" opacity="0.1" clipPath="url(#below-zero)" />

            {/* P&L line - profit portion */}
            <path d={pathPoints.join(' ')} fill="none" stroke="#10B981" strokeWidth="2"
              clipPath="url(#above-zero)" strokeLinejoin="round" />

            {/* P&L line - loss portion */}
            <path d={pathPoints.join(' ')} fill="none" stroke="#EF4444" strokeWidth="2"
              clipPath="url(#below-zero)" strokeLinejoin="round" />

            {/* Breakeven dot */}
            <circle cx={toX(p)} cy={zeroY} r="4" fill="white" stroke="#3B82F6" strokeWidth="2" />

            {/* Y-axis labels — hide if too close to $0 line */}
            {Math.abs(toY(maxProfit) - zeroY) > 14 && (
              <text x={padL - 4} y={toY(maxProfit)} textAnchor="end" dominantBaseline="middle"
                className="text-[9px] font-semibold" fill="#10B981">{formatDollar(maxProfit)}</text>
            )}
            {Math.abs(toY(maxLoss) - zeroY) > 14 && (
              <text x={padL - 4} y={toY(maxLoss)} textAnchor="end" dominantBaseline="middle"
                className="text-[9px] font-semibold" fill="#EF4444">{formatDollar(maxLoss)}</text>
            )}
            <text x={padL - 4} y={zeroY} textAnchor="end" dominantBaseline="middle"
              className="text-[9px] font-medium" fill="#9CA3AF">$0</text>

            {/* X-axis labels — hide if too close to breakeven */}
            {probability > 12 && (
              <text x={toX(0)} y={H - 4} textAnchor="middle" className="text-[9px] font-medium" fill="#9CA3AF">0%</text>
            )}
            {Math.abs(probability - 50) > 12 && (
              <text x={toX(0.5)} y={H - 4} textAnchor="middle" className="text-[9px] font-medium" fill="#9CA3AF">50%</text>
            )}
            {probability < 88 && (
              <text x={toX(1)} y={H - 4} textAnchor="middle" className="text-[9px] font-medium" fill="#9CA3AF">100%</text>
            )}

            {/* Breakeven label */}
            <text x={toX(p)} y={H - 4} textAnchor="middle" className="text-[9px] font-bold" fill="#3B82F6">
              {breakeven}%
            </text>

            {/* Hover crosshair */}
            {hover && (
              <>
                <line x1={padL + (hover.prob / 100) * chartW} y1={padT}
                  x2={padL + (hover.prob / 100) * chartW} y2={padT + chartH}
                  stroke="#6B7280" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                <circle
                  cx={padL + (hover.prob / 100) * chartW}
                  cy={toY(hover.pnl)}
                  r="4" fill={hover.pnl >= 0 ? '#10B981' : '#EF4444'}
                  stroke="white" strokeWidth="2" />
              </>
            )}
          </svg>
        )}

        {/* Hover tooltip */}
        {hover && amount > 0 && (
          <div
            className="absolute px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none z-10"
            style={{
              left: `${Math.max(15, Math.min(85, (hover.x / W) * 100))}%`,
              top: 4,
              transform: 'translateX(-50%)',
              background: '#111827',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span className={hover.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {formatDollar(hover.pnl)}
            </span>
            <span className="text-white/50 ml-1.5">@ {hover.prob.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Outcome summary */}
      {amount > 0 && (
        <div className="flex gap-2 mt-2">
          <div className="flex-1 text-center py-1.5 rounded-lg bg-green-bg">
            <p className="text-[9px] text-text-muted font-medium uppercase tracking-wider">
              {side === 'yes' ? 'Yes' : 'No'} wins
            </p>
            <p className="text-green font-extrabold text-[14px] tabular-nums leading-tight">
              {formatDollar(maxProfit)}
            </p>
            <p className="text-[9px] text-text-muted tabular-nums">
              {((maxProfit / amount) * 100).toFixed(0)}% return
            </p>
          </div>
          <div className="flex-1 text-center py-1.5 rounded-lg bg-red-bg">
            <p className="text-[9px] text-text-muted font-medium uppercase tracking-wider">
              {side === 'yes' ? 'No' : 'Yes'} wins
            </p>
            <p className="text-red font-extrabold text-[14px] tabular-nums leading-tight">
              {formatDollar(maxLoss)}
            </p>
            <p className="text-[9px] text-text-muted tabular-nums">
              {((maxLoss / amount) * 100).toFixed(0)}% loss
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
