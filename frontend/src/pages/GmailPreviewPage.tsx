import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Square, ArrowLeft, Download } from 'lucide-react'
import { useStore } from '../store/useStore'

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
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px]">
        {/* Back + Header */}
        <div className="mb-8">
          <button onClick={handleBack} className="text-[13px] text-[#999] hover:text-[#333] bg-transparent border-none cursor-pointer mb-4 p-0 transition-colors">
            &larr; Back
          </button>
          <h1 className="text-[20px] font-semibold text-[#1A1A1A] tracking-tight">
            Review positions
          </h1>
          <p className="text-[#999] text-[13px] mt-1">
            {gmailPreviewPositions.length} position{gmailPreviewPositions.length !== 1 ? 's' : ''} found in your Gmail
          </p>
        </div>

        {/* Table */}
        <div className="border border-[#E8E8E8] rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-3 border-b border-[#E8E8E8] bg-[#FAFAFA]">
            <div className="grid grid-cols-[1.5rem_1fr_2fr_4.5rem_5.5rem_5.5rem] gap-3 items-center text-[11px] text-[#999] uppercase tracking-wider">
              <button
                onClick={toggleAll}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer text-[#999] hover:text-[#333] transition-colors p-0"
              >
                {allChecked ? (
                  <CheckSquare size={15} className="text-[#1A1A1A]" />
                ) : someChecked ? (
                  <CheckSquare size={15} className="text-[#C0C0C0]" />
                ) : (
                  <Square size={15} />
                )}
              </button>
              <span>Ticker</span>
              <span>Name</span>
              <span className="text-right">Shares</span>
              <span className="text-right">Avg Cost</span>
              <span className="text-right">Value</span>
            </div>
          </div>

          {/* Rows */}
          <div className="max-h-[380px] overflow-y-auto">
            {gmailPreviewPositions.map((pos) => {
              const isSelected = selected.has(pos.ticker)
              return (
                <div
                  key={pos.ticker}
                  onClick={() => toggleRow(pos.ticker)}
                  className={`grid grid-cols-[1.5rem_1fr_2fr_4.5rem_5.5rem_5.5rem] gap-3 items-center px-4 py-3 cursor-pointer transition-colors border-b border-[#F0F0F0] last:border-b-0 ${
                    isSelected ? 'bg-white hover:bg-[#F8F8F8]' : 'bg-[#FAFAFA] opacity-50 hover:opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {isSelected ? (
                      <CheckSquare size={15} className="text-[#1A1A1A]" />
                    ) : (
                      <Square size={15} className="text-[#C0C0C0]" />
                    )}
                  </div>
                  <span className="font-semibold text-[#1A1A1A] text-[13px]">{pos.ticker}</span>
                  <span className="text-[#999] text-[13px] truncate">{pos.name}</span>
                  <span className="text-[#1A1A1A] text-[13px] text-right tabular-nums">{pos.shares.toLocaleString()}</span>
                  <span className="text-[#999] text-[13px] text-right tabular-nums">{fmt(pos.avgCost)}</span>
                  <span className="text-[#1A1A1A] text-[13px] text-right font-medium tabular-nums">{fmt(pos.marketValue)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5">
          <div>
            <span className="text-[#999] text-[13px]">
              {selected.size} of {gmailPreviewPositions.length} selected
            </span>
            {totalValue > 0 && (
              <p className="text-[#1A1A1A] text-[15px] font-semibold">{fmt(totalValue)}</p>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="font-medium py-3 px-6 rounded-lg text-[14px] disabled:opacity-30 cursor-pointer border-none text-white bg-[#1A1A1A] hover:bg-[#333] transition-colors flex items-center gap-2"
          >
            <Download size={14} />
            Import {selected.size > 0 ? selected.size : ''} position{selected.size !== 1 ? 's' : ''}
          </button>
        </div>

        <p className="text-[#B0B0B0] text-[11px] mt-6">Your data stays local.</p>
      </div>
    </div>
  )
}
