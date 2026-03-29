import { useState, useRef } from 'react'
import { Upload, Plus, Trash2, Loader2, Shield } from 'lucide-react'
import { useStore } from '../store/useStore'
import { uploadCSV, submitManualPositions } from '../api/client'

interface ManualRow { ticker: string; shares: string; averageCost: string }
const emptyRow = (): ManualRow => ({ ticker: '', shares: '', averageCost: '' })

export default function ImportPage() {
  const setPositions = useStore((s) => s.setPositions)
  const setLoggedIn = useStore((s) => s.setLoggedIn)
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

  const updateRow = (i: number, field: keyof ManualRow, value: string) => { const next = [...rows]; next[i] = { ...next[i], [field]: value }; setRows(next) }
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
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4 py-12">
      <div className="w-full max-w-[440px] animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
            <Shield size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Poly<span className="gradient-text">Hedge</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">Import your portfolio to get started</p>
        </div>

        <div className="card-static overflow-hidden">
          <div className="flex">
            {(['upload', 'manual'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-3 text-[13px] font-semibold text-center border-none cursor-pointer transition-all duration-200 ${
                  tab === t ? 'text-text-primary bg-white border-b-2 border-blue' : 'text-text-muted bg-bg-page hover:text-text-secondary'
                }`}>
                {t === 'upload' ? <><Upload size={12} className="inline mr-1" />Upload CSV</> : <><Plus size={12} className="inline mr-1" />Manual Entry</>}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'upload' && (
              <div className="space-y-4">
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    dragOver ? 'border-blue bg-blue-bg scale-[1.02]' : 'border-border hover:border-text-muted hover:bg-bg-hover'
                  }`}>
                  <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
                  {fileName ? (
                    <p className="text-text-primary text-sm font-semibold">{fileName}</p>
                  ) : (
                    <>
                      <Upload size={28} className="mx-auto mb-2 text-text-muted" />
                      <p className="text-text-primary text-sm font-semibold">Drop your CSV here or click to browse</p>
                      <p className="text-text-muted text-xs mt-1">Supports brokerage exports (CSV, Excel)</p>
                    </>
                  )}
                </div>
                <button onClick={handleUpload} disabled={loading || !fileName}
                  className="btn-3d btn-3d-blue btn-glow w-full bg-blue text-white font-bold py-3.5 rounded-2xl text-[14px] disabled:opacity-30 cursor-pointer border-none">
                  {loading ? <><Loader2 size={15} className="inline animate-spin mr-1.5" />Processing...</> : <><Upload size={15} className="inline mr-1.5" />Import Portfolio</>}
                </button>
              </div>
            )}

            {tab === 'manual' && (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_0.7fr_0.7fr_1.5rem] gap-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider px-0.5">
                  <span>Ticker</span><span>Shares</span><span>Avg Cost</span><span></span>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {rows.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_0.7fr_0.7fr_1.5rem] gap-2 items-center">
                      <input type="text" value={row.ticker} onChange={(e) => updateRow(i, 'ticker', e.target.value.toUpperCase())} placeholder="AAPL"
                        className="bg-bg-input border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none transition-all duration-200" />
                      <input type="number" value={row.shares} onChange={(e) => updateRow(i, 'shares', e.target.value)} placeholder="10" min="0"
                        className="bg-bg-input border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none transition-all duration-200" />
                      <input type="number" value={row.averageCost} onChange={(e) => updateRow(i, 'averageCost', e.target.value)} placeholder="$" min="0" step="0.01"
                        className="bg-bg-input border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none transition-all duration-200" />
                      <button onClick={() => removeRow(i)} disabled={rows.length <= 1}
                        className="p-0.5 text-text-muted hover:text-red transition-colors bg-transparent border-none cursor-pointer disabled:opacity-20"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addRow} className="w-full py-2 rounded-xl text-xs font-medium text-blue hover:bg-blue-bg transition-all duration-200 bg-transparent border border-dashed border-blue/30 cursor-pointer">
                  <Plus size={12} className="inline mr-1" />Add Row
                </button>
                <button onClick={handleManualSubmit} disabled={loading}
                  className="btn-3d btn-3d-blue btn-glow w-full bg-blue text-white font-bold py-3.5 rounded-2xl text-[14px] disabled:opacity-30 cursor-pointer border-none">
                  {loading ? <><Loader2 size={15} className="inline animate-spin mr-1.5" />Loading prices...</> : 'Import Portfolio'}
                </button>
              </div>
            )}

            {error && <p className="text-red text-xs mt-3 text-center animate-fade-in-up">{error}</p>}
          </div>
        </div>
        <p className="text-text-muted text-xs text-center mt-5">Your data stays local</p>
      </div>
    </div>
  )
}
