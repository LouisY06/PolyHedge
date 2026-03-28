import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
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
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      {/* Stock header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-hover transition-colors bg-transparent border-none text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-bg flex items-center justify-center flex-shrink-0">
            <span className="text-blue font-bold text-xs">
              {position.ticker.slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary text-sm">
                {position.ticker}
              </span>
              <span className="text-text-muted text-xs hidden sm:inline">
                {position.name}
              </span>
            </div>
            <p className="text-text-muted text-xs">
              {position.shares} shares · avg ${position.avgCost.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-text-primary font-semibold text-sm">
              ${position.marketValue.toLocaleString()}
            </p>
            <p
              className={`text-xs font-semibold ${
                isPositive ? 'text-green' : 'text-red'
              }`}
            >
              {isPositive ? '+' : ''}
              {position.gainLossPercent.toFixed(2)}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            {markets.length > 0 && (
              <span className="text-[10px] font-medium text-blue bg-blue-bg px-1.5 py-0.5 rounded">
                {markets.length}
              </span>
            )}
            <div className="text-text-muted">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>
      </button>

      {/* Related markets */}
      {expanded && (
        <div className="border-t border-border">
          {markets.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              No related markets found
            </p>
          ) : (
            <div>
              {markets.map((market, i) => {
                const isSelected = selectedMarkets.some(
                  (m) => m.id === market.id
                )
                const endDate = new Date(market.endDate)
                const daysLeft = Math.max(
                  0,
                  Math.ceil(
                    (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                )

                return (
                  <div
                    key={market.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                      i > 0 ? 'border-t border-border' : ''
                    } ${isSelected ? 'bg-blue-bg/50' : 'hover:bg-bg-hover'}`}
                    onClick={() => toggleMarketSelection(market)}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue border-blue'
                          : 'border-text-muted'
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
                      <p className="text-sm font-medium text-text-primary leading-snug">
                        {market.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-text-muted flex items-center gap-0.5">
                          <Clock size={10} />
                          {daysLeft}d
                        </span>
                        <span className="text-[11px] text-text-muted">
                          ${(market.volume / 1_000_000).toFixed(1)}M
                        </span>
                      </div>
                    </div>

                    {/* Yes / No prices */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="btn-3d btn-3d-green flex flex-col items-center justify-center w-[52px] h-[40px] rounded-md bg-green-bg cursor-pointer">
                        <span className="text-green text-sm font-bold leading-none">
                          {market.confidence}¢
                        </span>
                        <span className="text-green text-[9px] font-semibold mt-0.5">
                          Yes
                        </span>
                      </div>
                      <div className="btn-3d btn-3d-red flex flex-col items-center justify-center w-[52px] h-[40px] rounded-md bg-red-bg cursor-pointer">
                        <span className="text-red text-sm font-bold leading-none">
                          {100 - market.confidence}¢
                        </span>
                        <span className="text-red text-[9px] font-semibold mt-0.5">
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
