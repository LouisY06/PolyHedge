import { useState } from 'react'
import { useStore } from '../store/useStore'
import { loginRobinhood } from '../api/client'
import { Shield, ArrowRight, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setLoggedIn = useStore((s) => s.setLoggedIn)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your credentials')
      return
    }
    setLoading(true)
    setError('')
    try {
      const success = await loginRobinhood(email, password)
      if (success) setLoggedIn(true)
      else setError('Invalid credentials')
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}>
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[400px] relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
            <Shield size={28} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[32px] font-extrabold text-white tracking-tight">
            PolyHedge
          </h1>
          <p className="text-white/50 text-[15px] mt-2 font-medium">
            Hedge your portfolio with prediction markets
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-7 space-y-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div>
            <label htmlFor="email" className="block text-white/70 text-[13px] font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-white text-[15px] outline-none transition-all placeholder:text-white/30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white/70 text-[13px] font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-white text-[15px] outline-none transition-all placeholder:text-white/30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red/20 border border-red/30 rounded-lg px-4 py-2.5 animate-fade-in-scale">
              <p className="text-red text-[13px] font-medium" role="alert">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-glow w-full font-semibold py-3.5 rounded-xl text-[15px] disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2 text-white"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 0 0 #1D4ED8, 0 4px 20px rgba(59,130,246,0.3)' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Robinhood
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Lock size={10} className="text-white/30" />
            <p className="text-white/30 text-[11px]">
              Demo mode — any credentials will work
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
