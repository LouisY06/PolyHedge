import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Mail, Upload, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { importFromGmail } from '../api/client'
import { useStore } from '../store/useStore'
import type { Position } from '../types'

const GOOGLE_CLIENT_ID = '182734869118-anq8m434ve86scrdnl83ehj2uph2qik7.apps.googleusercontent.com'

interface BackendPosition {
  ticker: string
  name: string
  shares: number
  averageCost: number | null
  currentPrice: number | null
  marketValue: number | null
  gainLoss: number | null
  gainLossPercent: number | null
}

function toFrontendPosition(bp: BackendPosition): Position {
  return {
    ticker: bp.ticker,
    name: bp.name || bp.ticker,
    shares: bp.shares,
    avgCost: bp.averageCost ?? 0,
    currentPrice: bp.currentPrice ?? bp.averageCost ?? 0,
    marketValue: bp.marketValue ?? bp.shares * (bp.currentPrice ?? bp.averageCost ?? 0),
    gainLoss: bp.gainLoss ?? 0,
    gainLossPercent: bp.gainLossPercent ?? 0,
  }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const setGmailPreviewPositions = useStore((s) => s.setGmailPreviewPositions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnectGmail = () => {
    if (!window.google?.accounts?.oauth2) {
      setError('Google Identity Services not loaded. Please refresh the page.')
      return
    }

    setLoading(true)
    setError('')

    const redirectUri = window.location.origin

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      ux_mode: 'popup',
      redirect_uri: redirectUri,
      callback: async (response) => {
        if (response.error) {
          setError(`Google sign-in failed: ${response.error}`)
          setLoading(false)
          return
        }

        if (!response.code) {
          setError('No authorization code received.')
          setLoading(false)
          return
        }

        try {
          const result = await importFromGmail(response.code, redirectUri)
          const positions = (result.positions as BackendPosition[]).map(toFrontendPosition)
          setGmailPreviewPositions(positions)
          navigate('/gmail-preview')
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Gmail import failed')
        } finally {
          setLoading(false)
        }
      },
    })

    client.requestCode()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)', top: '10%', left: '15%' }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', bottom: '10%', right: '15%' }}
        animate={{ x: [0, -25, 15, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[350px] h-[350px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        animate={{ scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="w-full max-w-[420px] relative z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 8px 32px rgba(59,130,246,0.4)' }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield size={28} className="text-white" strokeWidth={2} />
          </motion.div>
          <h1 className="text-[32px] font-extrabold text-white tracking-tight">PolyHedge</h1>
          <p className="text-white/50 text-[15px] mt-2 font-medium">
            Hedge your portfolio with prediction markets
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="p-7 space-y-4 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.p
            className="text-white/60 text-[13px] text-center pb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            How would you like to import your portfolio?
          </motion.p>

          {/* Connect Gmail — primary */}
          <motion.button
            onClick={handleConnectGmail}
            disabled={loading}
            className="w-full font-semibold py-4 rounded-xl text-[15px] disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2.5 text-white"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 0 0 #1D4ED8, 0 4px 20px rgba(59,130,246,0.3)' }}
            whileHover={{ y: 2, boxShadow: '0 2px 0 0 #1D4ED8, 0 2px 10px rgba(59,130,246,0.2)' }}
            whileTap={{ y: 4, boxShadow: '0 0 0 0 #1D4ED8' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Scanning your emails...
              </>
            ) : (
              <>
                <Mail size={18} />
                Connect Gmail
                <ArrowRight size={16} className="ml-auto opacity-70" />
              </>
            )}
          </motion.button>

          {/* Divider */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-white/30 text-[12px] font-medium">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </motion.div>

          {/* Import CSV/Manual — secondary */}
          <motion.button
            onClick={() => navigate('/import')}
            disabled={loading}
            className="w-full font-semibold py-3.5 rounded-xl text-[14px] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2.5 text-white/70 hover:text-white transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Upload size={16} />
            Import CSV / Manual Entry
          </motion.button>

          {error && (
            <motion.div
              className="rounded-lg px-4 py-2.5"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <p className="text-red-400 text-[13px] font-medium" role="alert">{error}</p>
            </motion.div>
          )}
        </motion.div>

        <motion.p
          className="text-white/25 text-[11px] text-center mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Gmail access is read-only — we never store your emails
        </motion.p>
      </motion.div>
    </div>
  )
}
