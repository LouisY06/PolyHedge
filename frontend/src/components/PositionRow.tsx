import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react'
import type { Position, Market } from '../types'
import { useStore } from '../store/useStore'
import TradeModal from './TradeModal'

interface Props {
  position: Position
  markets: Market[]
}

export default function PositionRow({ position, markets }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = position.gainLoss >= 0
  const selectedMarkets = useStore((s) => s.selectedMarkets)
  const toggleMarketSelection = useStore((s) => s.toggleMarketSelection)

  const [tradeMarket, setTradeMarket] = useState<Market | null>(null)
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')

  const openTrade = (market: Market, side: 'yes' | 'no') => {
    setTradeMarket(market)
    setTradeSide(side)
  }

  return (
    <>
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
        {/* Stock header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-bg-hover transition-colors bg-transparent border-none text-left"
          aria-expanded={expanded}
          aria-label={`${position.ticker} ${position.name}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-blue-light flex items-center justify-center flex-shrink-0">
              <span className="text-accent-blue font-bold text-sm">
                {position.ticker.slice(0, 2)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-[15px]">
                  {position.ticker}
                </span>
                <span className="text-text-muted text-xs hidden sm:inline">
                  {position.name}
                </span>
              </div>
              <p className="text-text-muted text-xs mt-0.5">
                {position.shares} shares · avg ${position.avgCost.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-text-primary font-semibold text-[15px]">
                ${position.marketValue.toLocaleString()}
              </p>
              <p
                className={`text-xs font-semibold ${
                  isPositive ? 'text-accent-green' : 'text-accent-red'
                }`}
              >
                {isPositive ? '+' : ''}${position.gainLoss.toFixed(2)} (
                {isPositive ? '+' : ''}
                {position.gainLossPercent.toFixed(2)}%)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {markets.length > 0 && (
                <span className="text-[10px] font-semibold text-accent-blue bg-accent-blue-light px-2 py-0.5 rounded-full">
                  {markets.length} events
                </span>
              )}
              <div className="text-text-muted">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>
        </button>

        {/* Related markets */}
        {expanded && (
          <div className="border-t border-border bg-bg-primary px-4 py-3">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              Related Prediction Markets
            </p>
            {markets.length === 0 ? (
              <p className="text-text-muted text-sm py-3 text-center">
                No related markets found
              </p>
            ) : (
              <div className="space-y-2">
                {markets.map((market) => {
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
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-accent-blue bg-accent-blue-light/30 shadow-sm'
                          : 'border-border bg-bg-card hover:bg-bg-hover'
                      }`}
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
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-accent-blue border-accent-blue'
                            : 'border-border'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Market info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary leading-snug">
                          {market.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-primary border border-border text-text-secondary font-medium">
                            {market.category}
                          </span>
                          <span className="text-[11px] text-text-muted flex items-center gap-1">
                            <Clock size={10} />
                            {daysLeft}d left
                          </span>
                          <span className="text-[11px] text-text-muted font-medium">
                            ${(market.volume / 1_000_000).toFixed(1)}M vol
                          </span>
                        </div>
                      </div>

                      {/* Yes / No trade buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          className="text-center px-3 py-1.5 rounded-lg bg-accent-green-light hover:bg-accent-green/20 transition-colors border-none cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            openTrade(market, 'yes')
                          }}
                          aria-label={`Buy Yes at ${market.confidence} cents`}
                        >
                          <p className="text-accent-green text-sm font-bold leading-tight">
                            {market.confidence}¢
                          </p>
                          <p className="text-accent-green text-[9px] font-semibold uppercase">
                            Yes
                          </p>
                        </button>
                        <button
                          className="text-center px-3 py-1.5 rounded-lg bg-accent-red-light hover:bg-accent-red/20 transition-colors border-none cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            openTrade(market, 'no')
                          }}
                          aria-label={`Buy No at ${100 - market.confidence} cents`}
                        >
                          <p className="text-accent-red text-sm font-bold leading-tight">
                            {100 - market.confidence}¢
                          </p>
                          <p className="text-accent-red text-[9px] font-semibold uppercase">
                            No
                          </p>
                        </button>
                        <a
                          href={market.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-accent-blue transition-colors p-1"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`View ${market.title} on Polymarket`}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trade modal */}
      {tradeMarket && (
        <TradeModal
          market={tradeMarket}
          side={tradeSide}
          onClose={() => setTradeMarket(null)}
        />
      )}
    </>
  )
}
