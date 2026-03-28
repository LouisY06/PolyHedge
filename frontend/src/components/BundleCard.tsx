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
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-hover transition-colors bg-transparent border-none text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div>
          <h3 className="font-semibold text-text-primary text-sm">{bundle.name}</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {bundle.markets.length} events · {bundle.stocks.length} stocks · {bundle.hedgePercent}% hedged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeBundle(bundle.id)
            }}
            className="text-text-muted hover:text-red transition-colors bg-transparent border-none cursor-pointer p-1 rounded hover:bg-red-bg"
            aria-label={`Delete ${bundle.name}`}
          >
            <Trash2 size={13} />
          </button>
          <div className="text-text-muted">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">
                Events
              </p>
              <div className="space-y-1">
                {bundle.markets.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-bg-page border border-border rounded-md px-2.5 py-2"
                  >
                    <span className="text-xs text-text-primary leading-tight flex-1 mr-2">
                      {m.title}
                    </span>
                    <span className="text-xs font-bold text-green flex-shrink-0">
                      {m.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">
                Related Stocks
              </p>
              {bundle.stocks.length === 0 ? (
                <p className="text-text-muted text-xs py-2">No related stocks</p>
              ) : (
                <div className="space-y-1">
                  {bundle.stocks.map((s) => (
                    <div
                      key={s.ticker}
                      className="flex items-center justify-between bg-bg-page border border-border rounded-md px-2.5 py-2"
                    >
                      <span className="text-xs font-semibold text-text-primary">
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
