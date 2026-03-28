import { useState, useEffect } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { Position, Market, BundleSummary } from '../types'
import { fetchBundleSummary } from '../api/client'

interface Props {
  stocks: Position[]
  markets: Market[]
}

export default function AISummary({ stocks, markets }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<BundleSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (expanded && !summary && !loading) {
      setLoading(true)
      setError(false)
      fetchBundleSummary(stocks, markets)
        .then(setSummary)
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    }
  }, [expanded])

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-bg-card hover:bg-bg-hover transition-colors cursor-pointer border-none text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 text-purple text-xs font-semibold">
          <Sparkles size={12} />
          AI Hedge Summary
        </span>
        <span className="text-text-muted">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-2.5 border-t border-border">
          {loading && (
            <div className="flex items-center gap-2 text-text-muted text-xs py-2">
              <div className="w-3 h-3 border-[1.5px] border-purple border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </div>
          )}
          {error && (
            <p className="text-red text-xs">
              Failed.{' '}
              <button
                onClick={() => {
                  setLoading(true)
                  setError(false)
                  fetchBundleSummary(stocks, markets)
                    .then(setSummary)
                    .catch(() => setError(true))
                    .finally(() => setLoading(false))
                }}
                className="text-blue underline bg-transparent border-none cursor-pointer text-xs"
              >
                Retry
              </button>
            </p>
          )}
          {summary && (
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-text-muted font-semibold mb-0.5">Overview</p>
                <p className="text-text-primary leading-relaxed">{summary.explanation}</p>
              </div>
              <div>
                <p className="text-text-muted font-semibold mb-0.5">Risks Covered</p>
                <p className="text-text-primary leading-relaxed">{summary.riskCovered}</p>
              </div>
              <div>
                <p className="text-text-muted font-semibold mb-0.5">Why This Works</p>
                <p className="text-text-primary leading-relaxed">{summary.hedgeRationale}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
