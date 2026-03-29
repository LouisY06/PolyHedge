import { useState } from 'react'
import { Mail, Upload, Loader2 } from 'lucide-react'
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

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      ux_mode: 'popup',
      callback: async (response: { code?: string; error?: string }) => {
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
          const result = await importFromGmail(response.code, 'postmessage')
          if (result.positions.length === 0) {
            navigate('/import', { state: { gmailMessage: result.message || 'No trades found in your Robinhood emails' } })
            setLoading(false)
            return
          }
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[24px] font-semibold text-[#1A1A1A] tracking-tight">PolyHedge</h1>
          <p className="text-[#999] text-[14px] mt-1">
            Hedge your portfolio with prediction markets
          </p>
        </div>

        <div className="space-y-3">
          {/* Connect Gmail */}
          <button
            onClick={handleConnectGmail}
            disabled={loading}
            className="w-full font-medium py-3 rounded-lg text-[14px] disabled:opacity-50 cursor-pointer border border-[#E0E0E0] flex items-center justify-center gap-2 text-[#1A1A1A] bg-white hover:bg-[#F8F8F8] transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scanning emails...
              </>
            ) : (
              <>
                <Mail size={16} />
                Connect Gmail
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E8E8E8]" />
            <span className="text-[#B0B0B0] text-[12px]">or</span>
            <div className="flex-1 h-px bg-[#E8E8E8]" />
          </div>

          {/* Import CSV/Manual */}
          <button
            onClick={() => navigate('/import')}
            disabled={loading}
            className="w-full font-medium py-3 rounded-lg text-[14px] disabled:opacity-50 cursor-pointer border border-[#E0E0E0] flex items-center justify-center gap-2 text-[#1A1A1A] bg-white hover:bg-[#F8F8F8] transition-colors"
          >
            <Upload size={16} />
            Import CSV / Manual Entry
          </button>

          {error && (
            <p className="text-red text-[13px] mt-2">{error}</p>
          )}
        </div>

        <p className="text-[#B0B0B0] text-[11px] mt-6">
          Gmail access is read-only. Your data stays local.
        </p>
      </div>
    </div>
  )
}
