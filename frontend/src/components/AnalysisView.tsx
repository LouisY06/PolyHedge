import { useState } from 'react'
import { ExternalLink, ChevronRight } from 'lucide-react'
import type { AnalysisResult, SelectedMarket, PortfolioTheme } from '../types'

export default function AnalysisView({ analysis }: { analysis: AnalysisResult }) {
  const { portfolioThemes, selectedMarkets } = analysis
  const actionable = selectedMarkets.filter((m) => m.action !== 'SKIP')
  const [themesOpen, setThemesOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Themes */}
      {portfolioThemes.length > 0 && (
        <div>
          <button onClick={() => setThemesOpen(!themesOpen)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-left p-0 mb-2">
            <ChevronRight size={12} className={`text-text-muted transition-transform duration-200 ${themesOpen ? 'rotate-90' : ''}`} />
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Themes · {portfolioThemes.length}
            </span>
          </button>
          {themesOpen && (
            <div>
              {portfolioThemes.map((t, i) => <ThemeRow key={i} theme={t} last={i === portfolioThemes.length - 1} />)}
            </div>
          )}
        </div>
      )}

      {/* Markets */}
      {actionable.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Recommendations</p>
          {actionable.map((sm, i) => <MarketCard key={sm.marketId || i} market={sm} last={i === actionable.length - 1} />)}
        </div>
      )}
    </div>
  )
}

function ThemeRow({ theme, last }: { theme: PortfolioTheme; last: boolean }) {
  const isPos = theme.directionality === 'positive'
  const isNeg = theme.directionality === 'negative'
  return (
    <div className={`flex items-center py-3 ${last ? '' : 'border-b border-black/[0.04]'}`}>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] text-text-primary">{theme.theme}</span>
        <p className="text-text-muted text-[12px] mt-0.5 leading-snug">{theme.explanation}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <span className="text-[11px] text-text-muted">{theme.linkedHoldings.join(', ')}</span>
        <span className={`text-[11px] tabular-nums ${isPos ? 'text-green' : isNeg ? 'text-red' : 'text-text-muted'}`}>
          {isPos ? '+' : isNeg ? '-' : '~'}
        </span>
      </div>
    </div>
  )
}

function MarketCard({ market: sm, last }: { market: SelectedMarket; last: boolean }) {
  const posEdge = sm.edge > 0
  const actionLabel = sm.action === 'BUY_YES' ? 'Buy Yes' : sm.action === 'BUY_NO' ? 'Buy No' : 'Watch'
  const actionColor = sm.action === 'BUY_YES' ? 'text-green' : sm.action === 'BUY_NO' ? 'text-red' : 'text-text-secondary'
  const fmt = (v: number | null) => v == null ? '—' : v <= 1 ? `${(v * 100).toFixed(0)}%` : `${Math.round(v)}%`

  return (
    <div className={`py-4 ${last ? '' : 'border-b border-black/[0.04]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-muted">{sm.ticker}</span>
          <span className="text-black/10">·</span>
          <span className="text-[11px] text-text-muted">{sm.relation?.replace('_', ' ').toLowerCase()}</span>
        </div>
        <span className={`text-[11px] font-medium ${actionColor}`}>{actionLabel}</span>
      </div>

      {/* Title */}
      <p className="text-[14px] text-text-primary leading-snug mb-3">{sm.title}</p>

      {/* Stats row */}
      <div className="flex gap-4 mb-3">
        {[
          { v: fmt(sm.probability), l: 'Market' },
          { v: fmt(sm.fairProbability), l: 'Fair' },
          { v: `${posEdge ? '+' : ''}${(sm.edge * 100).toFixed(1)}%`, l: 'Edge', c: posEdge ? 'text-green' : 'text-red' },
          { v: sm.allocPctOfPortfolio != null ? `${(sm.allocPctOfPortfolio * 100).toFixed(1)}%` : '—', l: 'Alloc' },
        ].map((s) => (
          <div key={s.l}>
            <p className={`text-[13px] font-medium tabular-nums ${s.c || 'text-text-primary'}`}>{s.v}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      <p className="text-text-secondary text-[13px] leading-relaxed">{sm.plainEnglish || sm.whyLinked}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-text-muted tabular-nums">{(sm.confidence * 100).toFixed(0)}% conf · {(sm.qualityScore * 100).toFixed(0)}% quality</span>
        {sm.url && (
          <a href={sm.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-text-muted hover:text-text-primary transition-colors duration-150 flex items-center gap-1">
            Polymarket <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  )
}
