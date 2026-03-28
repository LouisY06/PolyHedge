import { useState } from 'react'
import { useStore } from '../store/useStore'
import { loginRobinhood } from '../api/client'

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
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            PolyHedge
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Hedge your portfolio with prediction markets
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border rounded-xl p-5 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-text-secondary text-xs font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none focus:border-blue transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-text-secondary text-xs font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none focus:border-blue transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red text-xs" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-3d w-full bg-text-primary text-bg-card font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 cursor-pointer border-none"
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
