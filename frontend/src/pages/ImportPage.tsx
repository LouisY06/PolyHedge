import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Plus, Trash2, Loader2, Shield, FileSpreadsheet, Lock } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #0F172A 100%)' }}>

      {/* Animated background orbs */}
      <motion.div className="absolute w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', top: '5%', left: '10%' }}
        animate={{ x: [0, 40, -30, 0], y: [0, -30, 40, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', bottom: '5%', right: '10%' }}
        animate={{ x: [0, -30, 20, 0], y: [0, 30, -20, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div className="absolute w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', top: '40%', right: '30%' }}
        animate={{ scale: [1, 1.25, 0.85, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div className="w-full max-w-[460px] relative z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>

        {/* Logo */}
        <motion.div className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}>
          <motion.div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 8px 32px rgba(59,130,246,0.4)' }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}>
            <Shield size={28} className="text-white" strokeWidth={2} />
          </motion.div>
          <h1 className="text-[34px] font-extrabold text-white tracking-tight font-heading">
            Poly<span style={{ background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hedge</span>
          </h1>
          <p className="text-white/40 text-[15px] mt-2 font-medium">Import your portfolio to get started</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}>

          {/* Tabs */}
          <div className="flex relative">
            {(['upload', 'manual'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-3.5 text-[13px] font-semibold text-center border-none cursor-pointer transition-all duration-200 bg-transparent relative z-10 ${
                  tab === t ? 'text-white' : 'text-white/35 hover:text-white/60'
                }`}>
                {t === 'upload' ? <><Upload size={13} className="inline mr-1.5 -mt-0.5" />Upload CSV</> : <><Plus size={13} className="inline mr-1.5 -mt-0.5" />Manual Entry</>}
              </button>
            ))}
            <motion.div className="absolute bottom-0 h-[2px] rounded-full"
              style={{ background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)', width: '50%' }}
              animate={{ left: tab === 'upload' ? '0%' : '50%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {tab === 'upload' && (
                <motion.div key="upload" className="space-y-4"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}>
                  <motion.div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className="rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
                    style={{
                      border: `2px dashed ${dragOver ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.12)'}`,
                      background: dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(139,92,246,0.4)' }}
                    whileTap={{ scale: 0.98 }}>
                    <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
                    {fileName ? (
                      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                        <FileSpreadsheet size={32} className="mx-auto mb-2 text-green" />
                        <p className="text-white text-sm font-semibold">{fileName}</p>
                        <p className="text-white/30 text-xs mt-1">Click to change file</p>
                      </motion.div>
                    ) : (
                      <>
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                          <Upload size={32} className="mx-auto mb-3 text-white/30" />
                        </motion.div>
                        <p className="text-white/80 text-sm font-semibold">Drop your CSV here or click to browse</p>
                        <p className="text-white/30 text-xs mt-1.5">Supports brokerage exports (CSV, Excel)</p>
                      </>
                    )}
                  </motion.div>

                  <motion.button onClick={handleUpload} disabled={loading || !fileName}
                    className="w-full font-bold py-3.5 rounded-xl text-[14px] disabled:opacity-30 cursor-pointer border-none text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 0 0 #1D4ED8, 0 4px 24px rgba(59,130,246,0.3)' }}
                    whileHover={{ y: 2, boxShadow: '0 2px 0 0 #1D4ED8, 0 2px 12px rgba(59,130,246,0.2)' }}
                    whileTap={{ y: 4, boxShadow: '0 0 0 0 #1D4ED8' }}>
                    {loading ? <><Loader2 size={15} className="animate-spin" />Processing...</> : <><Upload size={15} />Import Portfolio</>}
                  </motion.button>
                </motion.div>
              )}

              {tab === 'manual' && (
                <motion.div key="manual" className="space-y-3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}>
                  <div className="grid grid-cols-[1fr_0.7fr_0.7fr_1.5rem] gap-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider px-0.5">
                    <span>Ticker</span><span>Shares</span><span>Avg Cost</span><span></span>
                  </div>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {rows.map((row, i) => (
                      <motion.div key={i} className="grid grid-cols-[1fr_0.7fr_0.7fr_1.5rem] gap-2 items-center"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <input type="text" value={row.ticker} onChange={(e) => updateRow(i, 'ticker', e.target.value.toUpperCase())} placeholder="AAPL"
                          className="rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <input type="number" value={row.shares} onChange={(e) => updateRow(i, 'shares', e.target.value)} placeholder="10" min="0"
                          className="rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <input type="number" value={row.averageCost} onChange={(e) => updateRow(i, 'averageCost', e.target.value)} placeholder="$" min="0" step="0.01"
                          className="rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <button onClick={() => removeRow(i)} disabled={rows.length <= 1}
                          className="p-0.5 text-white/20 hover:text-red transition-colors bg-transparent border-none cursor-pointer disabled:opacity-20">
                          <Trash2 size={13} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  <motion.button onClick={addRow}
                    className="w-full py-2.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 transition-all bg-transparent cursor-pointer"
                    style={{ border: '1px dashed rgba(255,255,255,0.12)' }}
                    whileHover={{ borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.05)' }}>
                    <Plus size={12} className="inline mr-1" />Add Row
                  </motion.button>
                  <motion.button onClick={handleManualSubmit} disabled={loading}
                    className="w-full font-bold py-3.5 rounded-xl text-[14px] disabled:opacity-30 cursor-pointer border-none text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 0 0 #1D4ED8, 0 4px 24px rgba(59,130,246,0.3)' }}
                    whileHover={{ y: 2, boxShadow: '0 2px 0 0 #1D4ED8, 0 2px 12px rgba(59,130,246,0.2)' }}
                    whileTap={{ y: 4, boxShadow: '0 0 0 0 #1D4ED8' }}>
                    {loading ? <><Loader2 size={15} className="animate-spin" />Loading prices...</> : 'Import Portfolio'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p className="text-red text-xs mt-3 text-center"
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                {error}
              </motion.p>
            )}
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Lock size={10} className="text-white/20" />
          <p className="text-white/20 text-[11px]">Your data stays local</p>
        </div>
      </motion.div>
    </div>
  )
}
