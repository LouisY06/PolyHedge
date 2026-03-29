import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CheckSquare, Square, ArrowLeft, Download } from 'lucide-react'

export default function GmailPreviewPage() {
  const navigate = useNavigate()
  const gmailPreviewPositions = useStore((s) => s.gmailPreviewPositions)
  const setPositions = useStore((s) => s.setPositions)
  const setLoggedIn = useStore((s) => s.setLoggedIn)
  const clearGmailPreview = useStore((s) => s.clearGmailPreview)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (gmailPreviewPositions.length === 0) {
      navigate('/', { replace: true })
      return
    }
    // Select all by default
    setSelected(new Set(gmailPreviewPositions.map((p) => p.ticker)))
  }, [gmailPreviewPositions, navigate])

  const toggleRow = (ticker: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) next.delete(ticker)
      else next.add(ticker)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === gmailPreviewPositions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(gmailPreviewPositions.map((p) => p.ticker)))
    }
  }

  const handleImport = () => {
    const toImport = gmailPreviewPositions.filter((p) => selected.has(p.ticker))
    setPositions(toImport)
    setLoggedIn(true)
    clearGmailPreview()
    navigate('/dashboard')
  }

  const handleBack = () => {
    clearGmailPreview()
    navigate('/')
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  const selectedPositions = gmailPreviewPositions.filter((p) => selected.has(p.ticker))
  const totalValue = selectedPositions.reduce((sum, p) => sum + p.marketValue, 0)
  const allChecked = selected.size === gmailPreviewPositions.length
  const someChecked = selected.size > 0 && selected.size < gmailPreviewPositions.length

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4 py-12">
      <div className="w-full max-w-[640px] animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Review Detected Positions
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {gmailPreviewPositions.length} position{gmailPreviewPositions.length !== 1 ? 's' : ''} found in your Gmail — select which to import
          </p>
        </div>

        <div className="card-static overflow-hidden">
          {/* Table header */}
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <div className="grid grid-cols-[2rem_1fr_2fr_5rem_6rem_6rem] gap-3 items-center text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              <button
                onClick={toggleAll}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer text-text-muted hover:text-text-primary transition-colors p-0"
                aria-label={allChecked ? 'Deselect all' : 'Select all'}
              >
                {allChecked ? (
                  <CheckSquare size={16} className="text-blue" />
                ) : someChecked ? (
                  <CheckSquare size={16} className="text-text-muted opacity-50" />
                ) : (
                  <Square size={16} />
                )}
              </button>
              <span>Ticker</span>
              <span>Name</span>
              <span className="text-right">Shares</span>
              <span className="text-right">Avg Cost</span>
              <span className="text-right">Value</span>
            </div>
          </div>

          {/* Table rows */}
          <div className="max-h-[380px] overflow-y-auto">
            {gmailPreviewPositions.map((pos) => {
              const isSelected = selected.has(pos.ticker)
              return (
                <div
                  key={pos.ticker}
                  onClick={() => toggleRow(pos.ticker)}
                  className={`grid grid-cols-[2rem_1fr_2fr_5rem_6rem_6rem] gap-3 items-center px-5 py-3.5 cursor-pointer transition-all duration-150 border-b border-border last:border-b-0 ${
                    isSelected ? 'bg-blue-bg/40 hover:bg-blue-bg/60' : 'hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {isSelected ? (
                      <CheckSquare size={16} className="text-blue" />
                    ) : (
                      <Square size={16} className="text-text-muted" />
                    )}
                  </div>
                  <span className="font-bold text-text-primary text-sm">{pos.ticker}</span>
                  <span className="text-text-secondary text-sm truncate">{pos.name}</span>
                  <span className="text-text-primary text-sm text-right">{pos.shares.toLocaleString()}</span>
                  <span className="text-text-secondary text-sm text-right">{fmt(pos.avgCost)}</span>
                  <span className="text-text-primary text-sm text-right font-medium">{fmt(pos.marketValue)}</span>
                </div>
              )
            })}
          </div>

          {/* Footer summary + actions */}
          <div className="px-5 py-4 border-t border-border bg-bg-hover/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-muted text-sm">
                {selected.size} of {gmailPreviewPositions.length} selected
              </span>
              <div className="text-right">
                <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Total Value</p>
                <p className="text-lg font-extrabold text-text-primary">{fmt(totalValue)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-none flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors bg-transparent border border-border hover:border-text-muted cursor-pointer"
              >
                <ArrowLeft size={15} />
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="btn-3d btn-3d-blue btn-glow flex-1 flex items-center justify-center gap-2 bg-blue text-white font-bold py-3 rounded-2xl text-[14px] disabled:opacity-30 cursor-pointer border-none"
              >
                <Download size={15} />
                Import {selected.size > 0 ? selected.size : ''} Position{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>

        <p className="text-text-muted text-xs text-center mt-5">Your data stays local — never sent to our servers</p>
      </div>
    </div>
  )
}
