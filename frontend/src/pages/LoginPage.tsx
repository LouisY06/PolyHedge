import { useState } from 'react'
import { motion } from 'framer-motion'
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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}>
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
        className="w-full max-w-[400px] relative z-10"
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
          <h1 className="text-[32px] font-extrabold text-white tracking-tight">
            PolyHedge
          </h1>
          <p className="text-white/50 text-[15px] mt-2 font-medium">
            Hedge your portfolio with prediction markets
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="p-7 space-y-5 rounded-2xl"
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
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <label htmlFor="email" className="block text-white/70 text-[13px] font-medium mb-2">Email</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-white text-[15px] outline-none transition-all placeholder:text-white/30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="you@example.com" autoComplete="email"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <label htmlFor="password" className="block text-white/70 text-[13px] font-medium mb-2">Password</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-white text-[15px] outline-none transition-all placeholder:text-white/30"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="••••••••" autoComplete="current-password"
            />
          </motion.div>

          {error && (
            <motion.div
              className="bg-red/20 border border-red/30 rounded-lg px-4 py-2.5"
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <p className="text-red text-[13px] font-medium" role="alert">{error}</p>
            </motion.div>
          )}

          <motion.button
            type="submit" disabled={loading}
            className="btn-glow w-full font-semibold py-3.5 rounded-xl text-[15px] disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2 text-white"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 0 0 #1D4ED8, 0 4px 20px rgba(59,130,246,0.3)' }}
            whileHover={{ y: 2, boxShadow: '0 2px 0 0 #1D4ED8, 0 2px 10px rgba(59,130,246,0.2)' }}
            whileTap={{ y: 4, boxShadow: '0 0 0 0 #1D4ED8' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
            ) : (
              <>Connect Robinhood <ArrowRight size={16} /></>
            )}
          </motion.button>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Lock size={10} className="text-white/30" />
            <p className="text-white/30 text-[11px]">Demo mode — any credentials will work</p>
          </div>
        </motion.form>
      </motion.div>
    </div>
  )
}
