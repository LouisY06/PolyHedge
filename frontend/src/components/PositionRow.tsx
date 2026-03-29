import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Clock } from 'lucide-react'
import type { Position, Market } from '../types'
import { useStore } from '../store/useStore'
import MiniSparkline from './charts/MiniSparkline'
import ConfidenceBar from './charts/ConfidenceBar'

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
    <motion.div
      className="card overflow-hidden"
      layout
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
    >
      {/* Stock header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-bg-hover transition-colors duration-200 bg-transparent border-none text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[13px] text-white" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
            {position.ticker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-primary text-[15px]">{position.ticker}</span>
              <span className="text-text-muted text-[12px] hidden sm:inline font-medium">{position.name}</span>
            </div>
            <p className="text-text-muted text-[12px] mt-0.5">{position.shares} shares · avg ${position.avgCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <MiniSparkline positive={isPositive} seed={position.ticker.charCodeAt(0) * 100 + position.ticker.charCodeAt(1)} />
          <div className="text-right">
            <p className="text-text-primary font-bold text-[16px] tabular-nums">${position.marketValue.toLocaleString()}</p>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums mt-0.5 ${isPositive ? 'text-green bg-green-bg' : 'text-red bg-red-bg'}`}>
              {isPositive ? '+' : ''}{position.gainLossPercent.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            {markets.length > 0 && (
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full tabular-nums" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                {markets.length}
              </span>
            )}
            <motion.div
              className="text-text-muted"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <ChevronDown size={18} />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Related markets */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="border-t border-border overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
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
                    <motion.div
                      key={market.id}
                      className={`flex items-center gap-4 px-5 py-4 cursor-pointer ${i > 0 ? 'border-t border-border' : ''} ${isSelected ? 'bg-blue-bg/60' : 'hover:bg-bg-hover'}`}
                      onClick={() => toggleMarketSelection(market)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ x: 4 }}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMarketSelection(market) }
                      }}
                    >
                      {/* Checkbox */}
                      <motion.div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue' : 'border-border hover:border-text-muted'}`}
                        style={isSelected ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)' } : {}}
                        animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {isSelected && (
                          <motion.svg width="11" height="11" viewBox="0 0 12 12" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                        )}
                      </motion.div>

                      {/* Market info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary leading-snug">{market.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-text-muted flex items-center gap-1 font-medium"><Clock size={10} />{daysLeft}d left</span>
                          <span className="text-[11px] text-text-muted tabular-nums font-medium">${(market.volume / 1_000_000).toFixed(1)}M vol</span>
                        </div>
                        <div className="mt-2 max-w-[200px]">
                          <ConfidenceBar confidence={market.confidence} delay={i * 0.1} />
                        </div>
                      </div>

                      {/* Yes / No buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.div
                          className="btn-3d btn-3d-green flex flex-col items-center justify-center w-[56px] h-[44px] rounded-xl cursor-pointer"
                          style={{ background: 'linear-gradient(180deg, #F0FDF4, #DCFCE7)' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-green text-[14px] font-extrabold leading-none tabular-nums">{market.confidence}¢</span>
                          <span className="text-green/60 text-[9px] font-bold mt-0.5 uppercase tracking-wider">Yes</span>
                        </motion.div>
                        <motion.div
                          className="btn-3d btn-3d-red flex flex-col items-center justify-center w-[56px] h-[44px] rounded-xl cursor-pointer"
                          style={{ background: 'linear-gradient(180deg, #FEF2F2, #FEE2E2)' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-red text-[14px] font-extrabold leading-none tabular-nums">{100 - market.confidence}¢</span>
                          <span className="text-red/60 text-[9px] font-bold mt-0.5 uppercase tracking-wider">No</span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
