import { useState } from 'react'
import { ExternalLink, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, Target, Layers, GitBranch, Radio, XCircle } from 'lucide-react'
import type { AnalysisResult, SelectedMarket, PortfolioTheme } from '../types'

const REL: Record<string, { label: string; icon: typeof ShieldCheck }> = {
  SUPPORTS: { label: 'Supports', icon: TrendingUp }, OFFSETS: { label: 'Hedge', icon: ShieldCheck },
  GATEKEEPER: { label: 'Gatekeeper', icon: Target }, UMBRELLA: { label: 'Umbrella', icon: Layers },
  BRANCH: { label: 'Branch', icon: GitBranch }, REGIME_SIGNAL: { label: 'Macro', icon: Radio },
  NO_ACTION: { label: 'Skip', icon: XCircle },
}

export default function AnalysisView({ analysis }: { analysis: AnalysisResult }) {
  const { portfolioThemes, selectedMarkets, portfolioSummary } = analysis
  const actionable = selectedMarkets.filter((m) => m.action !== 'SKIP')
  const [themesOpen, setThemesOpen] = useState(false)

  return (
    <div className="space-y-4 stagger">
      {/* Summary */}
      <div className="card-static">
        {portfolioSummary.abstainReason ? (
          <div className="flex items-start gap-2.5 p-5">
            <AlertTriangle size={16} className="text-[#F97316] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-primary">{portfolioSummary.abstainReason}</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <p className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3">AI Summary</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: `${(portfolioSummary.predictionSleevePct * 100).toFixed(1)}%`, l: 'Sleeve' },
                { v: String(actionable.length), l: 'Markets' },
                { v: portfolioSummary.topExposure || '—', l: 'Top Risk' },
              ].map((s) => (
                <div key={s.l} className="bg-bg-page rounded-xl py-3 text-center">
                  <p className="text-text-primary text-[15px] font-bold">{s.v}</p>
                  <p className="text-text-muted text-[10px] font-medium">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Themes */}
      {portfolioThemes.length > 0 && (
        <div className="card-static">
          <button onClick={() => setThemesOpen(!themesOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-left">
            <span className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">
              Themes <span className="text-text-muted font-medium lowercase text-xs ml-1">{portfolioThemes.length}</span>
            </span>
            {themesOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
          </button>
          {themesOpen && (
            <div className="px-5 pb-4 animate-slide-down">
              {portfolioThemes.map((t, i) => <ThemeRow key={i} theme={t} last={i === portfolioThemes.length - 1} />)}
            </div>
          )}
        </div>
      )}

      {/* Markets */}
      {actionable.length > 0 && actionable.map((sm, i) => <MarketCard key={sm.marketId || i} market={sm} />)}
    </div>
  )
}

function ThemeRow({ theme, last }: { theme: PortfolioTheme; last: boolean }) {
  const c = theme.directionality === 'positive' ? 'text-green' : theme.directionality === 'negative' ? 'text-red' : 'text-[#F97316]'
  return (
    <div className={`flex items-start gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">{theme.theme}</span>
          <span className={`text-[10px] font-bold uppercase ${c}`}>{theme.directionality}</span>
        </div>
        <p className="text-text-muted text-xs mt-0.5">{theme.explanation}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {theme.linkedHoldings.map((t) => (
          <span key={t} className="text-[10px] font-semibold text-text-muted bg-bg-page px-1.5 py-0.5 rounded-lg">{t}</span>
        ))}
      </div>
    </div>
  )
}

function MarketCard({ market: sm }: { market: SelectedMarket }) {
  const rel = REL[sm.relation] || REL.NO_ACTION
  const RelIcon = rel.icon
  const posEdge = sm.edge > 0
  const actionLabel = sm.action === 'BUY_YES' ? 'Buy Yes' : sm.action === 'BUY_NO' ? 'Buy No' : 'Watch'
  const actionColor = sm.action === 'BUY_YES' ? 'text-green' : sm.action === 'BUY_NO' ? 'text-red' : 'text-text-secondary'
  const fmt = (v: number | null) => v == null ? '—' : v <= 1 ? `${(v * 100).toFixed(0)}%` : `${Math.round(v)}%`

  return (
    <div className="card-static overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>{sm.ticker}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-medium"><RelIcon size={10} />{rel.label}</span>
          </div>
          <span className={`text-[11px] font-bold ${actionColor}`}>{actionLabel}</span>
        </div>
        <p className="text-[15px] font-bold text-text-primary leading-snug">{sm.title}</p>
      </div>

      <div className="mx-5 grid grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
        {[
          { v: fmt(sm.probability), l: 'Market' },
          { v: fmt(sm.fairProbability), l: 'Fair Value' },
          { v: `${posEdge ? '+' : ''}${(sm.edge * 100).toFixed(1)}%`, l: 'Edge', c: posEdge ? 'text-green' : 'text-red' },
          { v: sm.allocPctOfPortfolio != null ? `${(sm.allocPctOfPortfolio * 100).toFixed(1)}%` : '—', l: 'Alloc' },
        ].map((s) => (
          <div key={s.l} className="bg-bg-card py-2.5 text-center">
            <p className={`text-[13px] font-bold ${s.c || 'text-text-primary'} tabular-nums`}>{s.v}</p>
            <p className="text-[10px] text-text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="px-5 pt-3 pb-4">
        <p className="text-text-secondary text-[13px] leading-relaxed">{sm.plainEnglish || sm.whyLinked}</p>
        {sm.riskCovered && <p className="text-text-muted text-xs mt-1.5">Risk: {sm.riskCovered}</p>}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-[10px] text-text-muted tabular-nums">{(sm.confidence * 100).toFixed(0)}% conf &middot; {(sm.qualityScore * 100).toFixed(0)}% quality</span>
          {sm.url && <a href={sm.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-text-muted hover:text-blue transition-colors flex items-center gap-1">Polymarket <ExternalLink size={9} /></a>}
        </div>
      </div>
    </div>
  )
}
