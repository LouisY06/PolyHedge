import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Bundle } from '../types'
import { useStore } from '../store/useStore'
import AISummary from './AISummary'

interface Props {
  bundle: Bundle
}

export default function BundleCard({ bundle }: Props) {
  const [expanded, setExpanded] = useState(false)
  const removeBundle = useStore((s) => s.removeBundle)

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-bg-hover transition-colors bg-transparent border-none text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div>
          <h3 className="font-semibold text-text-primary">{bundle.name}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>{bundle.markets.length} events</span>
            <span>·</span>
            <span>{bundle.stocks.length} stocks</span>
            <span>·</span>
            <span>{bundle.hedgePercent}% hedged</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeBundle(bundle.id)
            }}
            className="text-text-muted hover:text-accent-red transition-colors bg-transparent border-none cursor-pointer p-1.5 rounded-lg hover:bg-accent-red-light"
            aria-label={`Delete bundle ${bundle.name}`}
          >
            <Trash2 size={14} />
          </button>
          <div className="text-text-muted">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 bg-bg-primary space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-semibold">
                Events
              </p>
              <div className="space-y-1.5">
                {bundle.markets.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-bg-card border border-border rounded-xl px-3 py-2.5"
                  >
                    <span className="text-xs text-text-primary leading-tight flex-1 mr-2">
                      {m.title}
                    </span>
                    <span className="text-xs font-bold text-accent-green flex-shrink-0">
                      {m.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-semibold">
                Related Stocks
              </p>
              {bundle.stocks.length === 0 ? (
                <p className="text-text-muted text-xs py-2">No related stocks</p>
              ) : (
                <div className="space-y-1.5">
                  {bundle.stocks.map((s) => (
                    <div
                      key={s.ticker}
                      className="flex items-center justify-between bg-bg-card border border-border rounded-xl px-3 py-2.5"
                    >
                      <span className="text-sm font-semibold text-text-primary">
                        {s.ticker}
                      </span>
                      <span className="text-xs text-text-muted">
                        ${s.marketValue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <AISummary stocks={bundle.stocks} markets={bundle.markets} />
        </div>
      )}
    </div>
  )
}
