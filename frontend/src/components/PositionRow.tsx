import { useState } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import type { Position, Market } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  position: Position
  markets: Market[]
}

export default function PositionRow({ position, markets }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = position.gainLoss >= 0
  const selectedMarkets = useStore((s) => s.selectedMarkets)
  const toggleMarketSelection = useStore((s) => s.toggleMarketSelection)

  return (
    <div className="card overflow-hidden">
      {/* Stock header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-bg-hover transition-all duration-200 bg-transparent border-none text-left group"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3.5">
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
              {position.shares} shares · avg ${position.avgCost.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-text-primary font-bold text-[16px] tabular-nums">
              ${position.marketValue.toLocaleString()}
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

      {/* Related markets */}
      {expanded && (
        <div className="border-t border-border animate-slide-down">
          {markets.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-text-muted text-[13px]">No related markets found</p>
            </div>
          ) : (
            <div>
              {markets.map((market, i) => {
                const isSelected = selectedMarkets.some((m) => m.id === market.id)
                const endDate = new Date(market.endDate)
                const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))

                return (
                  <div
                    key={market.id}
                    className={`flex items-center gap-4 px-5 py-4 transition-all duration-200 cursor-pointer ${
                      i > 0 ? 'border-t border-border' : ''
                    } ${isSelected ? 'bg-blue-bg/60' : 'hover:bg-bg-hover'}`}
                    onClick={() => toggleMarketSelection(market)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleMarketSelection(market)
                      }
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue scale-110'
                          : 'border-border hover:border-text-muted'
                      }`}
                      style={isSelected ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)' } : {}}
                    >
                      {isSelected && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Market info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary leading-snug">
                        {market.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-text-muted flex items-center gap-1 font-medium">
                          <Clock size={10} />
                          {daysLeft}d left
                        </span>
                        <span className="text-[11px] text-text-muted tabular-nums font-medium">
                          ${(market.volume / 1_000_000).toFixed(1)}M vol
                        </span>
                      </div>
                    </div>

                    {/* Yes / No buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="btn-3d btn-3d-green flex flex-col items-center justify-center w-[56px] h-[44px] rounded-xl cursor-pointer" style={{ background: 'linear-gradient(180deg, #F0FDF4, #DCFCE7)' }}>
                        <span className="text-green text-[14px] font-extrabold leading-none tabular-nums">
                          {market.confidence}¢
                        </span>
                        <span className="text-green/60 text-[9px] font-bold mt-0.5 uppercase tracking-wider">
                          Yes
                        </span>
                      </div>
                      <div className="btn-3d btn-3d-red flex flex-col items-center justify-center w-[56px] h-[44px] rounded-xl cursor-pointer" style={{ background: 'linear-gradient(180deg, #FEF2F2, #FEE2E2)' }}>
                        <span className="text-red text-[14px] font-extrabold leading-none tabular-nums">
                          {100 - market.confidence}¢
                        </span>
                        <span className="text-red/60 text-[9px] font-bold mt-0.5 uppercase tracking-wider">
                          No
                        </span>
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
