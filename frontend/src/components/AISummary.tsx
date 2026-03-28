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
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-card hover:bg-bg-hover transition-colors cursor-pointer border-none text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-accent-purple text-sm font-semibold">
          <Sparkles size={14} />
          AI Hedge Summary
        </span>
        <span className="text-text-muted">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-bg-primary border-t border-border">
          {loading && (
            <div className="flex items-center gap-2 text-text-muted text-sm py-2">
              <div className="w-4 h-4 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
              Analyzing your bundle...
            </div>
          )}

          {error && (
            <p className="text-accent-red text-sm">
              Failed to generate summary.{' '}
              <button
                onClick={() => {
                  setLoading(true)
                  setError(false)
                  fetchBundleSummary(stocks, markets)
                    .then(setSummary)
                    .catch(() => setError(true))
                    .finally(() => setLoading(false))
                }}
                className="text-accent-blue underline bg-transparent border-none cursor-pointer text-sm font-medium"
              >
                Retry
              </button>
            </p>
          )}

          {summary && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-text-muted text-xs font-semibold mb-1">
                  Overview
                </p>
                <p className="text-text-primary leading-relaxed">
                  {summary.explanation}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-semibold mb-1">
                  Risks Covered
                </p>
                <p className="text-text-primary leading-relaxed">
                  {summary.riskCovered}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs font-semibold mb-1">
                  Why This Hedge Works
                </p>
                <p className="text-text-primary leading-relaxed">
                  {summary.hedgeRationale}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
