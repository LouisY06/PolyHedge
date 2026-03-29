import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  /** Entry probability 0–100 (YES price in cents) */
  probability: number
  /** Which side: 'yes' or 'no' */
  side: 'yes' | 'no'
}

/**
 * P&L Payoff Surface — canvas-rendered 2D heatmap.
 *
 * X-axis = Outcome probability (0% → 100%)
 * Y-axis = Time remaining (0% → 100%)
 * Color  = Profit (green) / Loss (red)
 *
 * Model: For BUY YES at entry price `p`:
 *   - Mark-to-market value at (prob, time) uses a sigmoid sharpening
 *     as time decreases: the surface converges to binary payoff at expiry.
 *   - At time=100% (far from expiry): value ≈ prob (linear)
 *   - At time=0% (expiry): value → 1 if prob>50%, 0 if prob<50%
 *   - Breakeven curve: where P&L = 0 (the entry price contour)
 */
export default function PayoutHeatmap({ probability, side }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; prob: number; time: number; pnl: number } | null>(null)
  const [dims, setDims] = useState({ w: 400, h: 260 })

  const entry = Math.max(1, Math.min(99, probability)) / 100

  // Compute P&L at a given (probability, timeRemaining) point
  const pnlAt = useCallback((prob01: number, timeLeft01: number): number => {
    // Sigmoid sharpening: as time → 0, probability snaps to 0 or 1
    // k controls sharpness: high k = binary, low k = linear
    const k = 0.5 + (1 - timeLeft01) * 8 // ranges from 0.5 (far) to 8.5 (expiry)
    const sharpenedProb = 1 / (1 + Math.exp(-k * (prob01 - 0.5) * 10))

    // Value of position
    const value = side === 'yes' ? sharpenedProb : 1 - sharpenedProb
    const cost = side === 'yes' ? entry : 1 - entry

    return value - cost
  }, [entry, side])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      if (width > 0) setDims({ w: Math.round(width), h: Math.round(width * 0.65) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const padL = 42
    const padR = 8
    const padT = 8
    const padB = 36

    const cw = dims.w
    const ch = dims.h
    canvas.width = cw * dpr
    canvas.height = ch * dpr
    canvas.style.width = `${cw}px`
    canvas.style.height = `${ch}px`
    ctx.scale(dpr, dpr)

    const plotW = cw - padL - padR
    const plotH = ch - padT - padB

    // Draw surface pixel by pixel (using 2px blocks for performance)
    const BLOCK = 2
    for (let px = 0; px < plotW; px += BLOCK) {
      for (let py = 0; py < plotH; py += BLOCK) {
        const prob01 = px / plotW
        const timeLeft01 = 1 - py / plotH // top = 100%, bottom = 0%

        const pnl = pnlAt(prob01, timeLeft01)

        // Color mapping
        const intensity = Math.min(1, Math.abs(pnl) * 2.5)

        let r: number, g: number, b: number
        if (pnl >= 0) {
          // Green: from dark bg to vivid green
          r = Math.round(20 + (16 - 20) * intensity)
          g = Math.round(30 + (185 - 30) * intensity)
          b = Math.round(35 + (129 - 35) * intensity)
        } else {
          // Red: from dark bg to vivid red
          r = Math.round(20 + (200 - 20) * intensity)
          g = Math.round(30 + (40 - 30) * intensity)
          b = Math.round(35 + (60 - 35) * intensity)
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(padL + px, padT + py, BLOCK, BLOCK)
      }
    }

    // Draw breakeven contour (where P&L ≈ 0)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    let started = false
    for (let py = 0; py < plotH; py += 1) {
      const timeLeft01 = 1 - py / plotH
      // Find prob where pnl = 0 via binary search
      let lo = 0, hi = 1
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2
        if (pnlAt(mid, timeLeft01) > 0) hi = mid
        else lo = mid
      }
      const beProb = (lo + hi) / 2
      const px = padL + beProb * plotW
      if (!started) { ctx.moveTo(px, padT + py); started = true }
      else ctx.lineTo(px, padT + py)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Axes
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'

    // X-axis labels
    for (let i = 0; i <= 10; i++) {
      const pct = i * 10
      const x = padL + (pct / 100) * plotW
      ctx.fillText(`${pct}%`, x, ch - 6)
    }
    // X-axis title
    ctx.fillStyle = '#6B7280'
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.fillText('Probability \u2192', padL + plotW / 2, ch - 20)

    // Y-axis labels
    ctx.textAlign = 'right'
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    for (let i = 0; i <= 5; i++) {
      const pct = i * 20
      const y = padT + (1 - pct / 100) * plotH
      ctx.fillText(`${pct}%`, padL - 6, y + 3.5)
    }

    // Y-axis title (rotated)
    ctx.save()
    ctx.translate(10, padT + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#6B7280'
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Time Remaining', 0, 0)
    ctx.restore()

  }, [dims, entry, side, pnlAt])

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const padL = 42, padR = 8, padT = 8, padB = 36
    const plotW = dims.w - padL - padR
    const plotH = dims.h - padT - padB
    const mx = e.clientX - rect.left - padL
    const my = e.clientY - rect.top - padT
    const prob01 = Math.max(0, Math.min(1, mx / plotW))
    const timeLeft01 = Math.max(0, Math.min(1, 1 - my / plotH))
    const pnl = pnlAt(prob01, timeLeft01)
    setHover({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      prob: prob01 * 100,
      time: timeLeft01 * 100,
      pnl,
    })
  }, [dims, pnlAt])

  const formatPnl = (v: number) => {
    const pct = (v * 100).toFixed(1)
    return v >= 0 ? `+${pct}%` : `${pct}%`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="#10B981" opacity="0.3" />
            <rect x="7" y="1" width="5" height="5" rx="1" fill="#10B981" opacity="0.5" />
            <rect x="1" y="7" width="5" height="5" rx="1" fill="#10B981" opacity="0.7" />
            <rect x="7" y="7" width="5" height="5" rx="1" fill="#10B981" opacity="0.9" />
            <rect x="13" y="1" width="2" height="5" rx="0.5" fill="#10B981" opacity="0.15" />
            <rect x="13" y="7" width="2" height="5" rx="0.5" fill="#10B981" opacity="0.4" />
          </svg>
          P&L Payoff Surface
        </h3>
        <span className="text-[10px] text-text-muted font-medium tabular-nums">
          {side === 'yes' ? 'YES' : 'NO'} @ {probability}¢
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden cursor-crosshair"
        style={{ background: '#141E26' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <canvas ref={canvasRef} className="block w-full" />

        {/* Hover crosshair + tooltip */}
        {hover && (
          <>
            {/* Vertical line */}
            <div
              className="absolute top-0 pointer-events-none"
              style={{
                left: hover.x,
                top: 8,
                bottom: 36,
                width: 1,
                backgroundColor: 'rgba(255,255,255,0.25)',
              }}
            />
            {/* Horizontal line */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: 42,
                right: 8,
                top: hover.y,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.25)',
              }}
            />
            {/* Tooltip */}
            <div
              className="absolute px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none z-10"
              style={{
                left: Math.min(hover.x + 12, dims.w - 120),
                top: Math.max(hover.y - 40, 4),
                background: 'rgba(0,0,0,0.85)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className={hover.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatPnl(hover.pnl)}
              </span>
              <span className="text-white/40 mx-1.5">|</span>
              <span className="text-white/60">{hover.prob.toFixed(0)}% prob</span>
              <span className="text-white/40 mx-1.5">|</span>
              <span className="text-white/60">{hover.time.toFixed(0)}% time</span>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#10B981' }} />
          <span className="text-[10px] text-text-muted font-medium">Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#C83232' }} />
          <span className="text-[10px] text-text-muted font-medium">Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.5)', width: 12 }} />
          <span className="text-[10px] text-text-muted font-medium">Breakeven</span>
        </div>
      </div>
    </div>
  )
}
