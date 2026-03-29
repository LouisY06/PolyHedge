import { useState, useRef } from 'react'
import { Upload, Plus, Trash2, Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { uploadCSV, submitManualPositions } from '../api/client'

interface ManualRow { ticker: string; shares: string; averageCost: string }
const emptyRow = (): ManualRow => ({ ticker: '', shares: '', averageCost: '' })

export default function ImportPage() {
  const setPositions = useStore((s) => s.setPositions)
  const setLoggedIn = useStore((s) => s.setLoggedIn)
  const navigate = useNavigate()
  const location = useLocation()
  const gmailMessage = (location.state as { gmailMessage?: string } | null)?.gmailMessage
  const [tab, setTab] = useState<'upload' | 'manual'>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [rows, setRows] = useState<ManualRow[]>([emptyRow(), emptyRow(), emptyRow()])

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xls', 'xlsx'].includes(ext || '')) { setError('Please upload a CSV or Excel file'); return }
    setFileName(file.name); setError('')
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a file first'); return }
    setLoading(true); setError('')
    try {
      const positions = await uploadCSV(file)
      if (positions.length === 0) { setError('No valid positions found'); setLoading(false); return }
      setPositions(positions); setLoggedIn(true)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Upload failed') }
    finally { setLoading(false) }
  }

  const updateRow = (i: number, field: keyof ManualRow, value: string) => {
    const next = [...rows]; next[i] = { ...next[i], [field]: value }; setRows(next)
  }
  const addRow = () => setRows([...rows, emptyRow()])
  const removeRow = (i: number) => { if (rows.length <= 1) return; setRows(rows.filter((_, idx) => idx !== i)) }

  const handleManualSubmit = async () => {
    const valid = rows.filter((r) => r.ticker.trim() && r.shares.trim())
      .map((r) => ({ ticker: r.ticker.trim().toUpperCase(), shares: parseFloat(r.shares), averageCost: r.averageCost ? parseFloat(r.averageCost) : undefined }))
      .filter((r) => r.shares > 0)
    if (valid.length === 0) { setError('Add at least one position'); return }
    setLoading(true); setError('')
    try {
      const positions = await submitManualPositions(valid)
      setPositions(positions); setLoggedIn(true)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && fileRef.current) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile(file) }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Back + Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/')} className="text-[13px] text-[#999] hover:text-[#333] bg-transparent border-none cursor-pointer mb-4 p-0 transition-colors">
            &larr; Back
          </button>
          <h1 className="text-[20px] font-semibold text-[#1A1A1A] tracking-tight">Import portfolio</h1>
          <p className="text-[#999] text-[13px] mt-1">Upload a file or enter positions manually</p>
        </div>

        {/* Gmail message */}
        {gmailMessage && (
          <div className="rounded-lg px-4 py-3 mb-4 bg-[#FFF8E1] border border-[#FFE082]">
            <p className="text-[#795548] text-[13px]">{gmailMessage}. Import manually instead:</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#E8E8E8] mb-6">
          {(['upload', 'manual'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`text-[13px] pb-2.5 mr-6 bg-transparent border-none cursor-pointer transition-colors ${
                tab === t
                  ? 'text-[#1A1A1A] font-medium border-b-2 border-[#1A1A1A] -mb-px'
                  : 'text-[#999] hover:text-[#666]'
              }`}>
              {t === 'upload' ? 'Upload CSV' : 'Manual Entry'}
            </button>
          ))}
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg p-8 text-center cursor-pointer transition-colors"
              style={{
                border: `1.5px dashed ${dragOver ? '#1A1A1A' : '#D0D0D0'}`,
                background: dragOver ? '#F8F8F8' : 'white',
              }}
            >
              <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
              {fileName ? (
                <>
                  <p className="text-[14px] font-medium text-[#1A1A1A]">{fileName}</p>
                  <p className="text-[12px] text-[#999] mt-1">Click to change</p>
                </>
              ) : (
                <>
                  <Upload size={24} className="mx-auto mb-2 text-[#C0C0C0]" />
                  <p className="text-[14px] text-[#666]">Drop CSV here or click to browse</p>
                  <p className="text-[12px] text-[#B0B0B0] mt-1">CSV, Excel</p>
                </>
              )}
            </div>

            <button onClick={handleUpload} disabled={loading || !fileName}
              className="w-full font-medium py-3 rounded-lg text-[14px] disabled:opacity-30 cursor-pointer border-none text-white bg-[#1A1A1A] hover:bg-[#333] transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Processing...</> : 'Import'}
            </button>
          </div>
        )}

        {/* Manual tab */}
        {tab === 'manual' && (
          <div className="space-y-3">
            <div className="flex gap-2 text-[11px] text-[#999] uppercase tracking-wider mb-1">
              <span className="flex-1">Ticker</span><span className="flex-1">Shares</span><span className="flex-1">Avg Cost</span><span className="w-5"></span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {rows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="text" value={row.ticker} onChange={(e) => updateRow(i, 'ticker', e.target.value.toUpperCase())} placeholder="AAPL"
                    className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-[13px] text-[#1A1A1A] bg-white border border-[#E0E0E0] outline-none placeholder:text-[#C0C0C0]" />
                  <input type="number" value={row.shares} onChange={(e) => updateRow(i, 'shares', e.target.value)} placeholder="10" min="0"
                    className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-[13px] text-[#1A1A1A] bg-white border border-[#E0E0E0] outline-none placeholder:text-[#C0C0C0]" />
                  <input type="number" value={row.averageCost} onChange={(e) => updateRow(i, 'averageCost', e.target.value)} placeholder="$" min="0" step="0.01"
                    className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-[13px] text-[#1A1A1A] bg-white border border-[#E0E0E0] outline-none placeholder:text-[#C0C0C0]" />
                  <button onClick={() => removeRow(i)} disabled={rows.length <= 1}
                    className="w-5 flex-shrink-0 p-0.5 text-[#C0C0C0] hover:text-red transition-colors bg-transparent border-none cursor-pointer disabled:opacity-20">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addRow}
              className="w-full py-2 rounded-lg text-[12px] text-[#999] hover:text-[#666] transition-colors bg-transparent cursor-pointer border border-dashed border-[#D0D0D0] hover:border-[#999]">
              <Plus size={12} className="inline mr-1" />Add row
            </button>
            <button onClick={handleManualSubmit} disabled={loading}
              className="w-full font-medium py-3 rounded-lg text-[14px] disabled:opacity-30 cursor-pointer border-none text-white bg-[#1A1A1A] hover:bg-[#333] transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />Loading prices...</> : 'Import'}
            </button>
          </div>
        )}

        {error && <p className="text-red text-[13px] mt-3">{error}</p>}

        <p className="text-[#B0B0B0] text-[11px] mt-6">Your data stays in your browser.</p>
      </div>
    </div>
  )
}
