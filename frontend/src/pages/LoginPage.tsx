import { useState } from 'react'
import { useStore } from '../store/useStore'
import { loginRobinhood } from '../api/client'
import { Shield } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent-blue-light flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-accent-blue" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">
            PolyHedge
          </h1>
          <p className="text-text-secondary text-sm">
            Hedge your portfolio with prediction markets
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-text-primary text-xs font-semibold mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue-light transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-text-primary text-xs font-semibold mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue-light transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-accent-red text-xs" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-blue text-white font-semibold py-3 rounded-xl text-sm hover:bg-accent-blue/90 transition-colors disabled:opacity-50 cursor-pointer border-none focus:ring-2 focus:ring-accent-blue-light focus:outline-none"
          >
            {loading ? 'Connecting...' : 'Connect Robinhood'}
          </button>

          <p className="text-text-muted text-xs text-center">
            Demo mode — any credentials will work
          </p>
        </form>
      </div>
    </div>
  )
}
