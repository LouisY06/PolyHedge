import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Market } from '../types'

interface Props {
  market: Market
  side: 'yes' | 'no'
  initialMode?: 'buy' | 'sell'
  onClose: () => void
}

export default function TradeModal({ market, side: initialSide, initialMode = 'buy', onClose }: Props) {
  const [mode, setMode] = useState<'buy' | 'sell'>(initialMode)
  const [side, setSide] = useState(initialSide)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const price = side === 'yes' ? market.confidence : 100 - market.confidence
  const numAmount = parseFloat(amount) || 0
  const shares = numAmount > 0 ? numAmount / (price / 100) : 0
  const potentialPayout = shares * 1
  const potentialReturn = numAmount > 0 ? potentialPayout - numAmount : 0
  const returnPercent = numAmount > 0 ? (potentialReturn / numAmount) * 100 : 0

  const handleSubmit = async () => {
    if (numAmount <= 0) return
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitting(false)
    setSuccess(true)
  }

  const isYes = side === 'yes'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-bg-card border border-border rounded-xl max-w-[400px] w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-text-primary truncate pr-4">
            {market.title}
          </p>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0.5 flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isYes ? 'bg-green-bg' : 'bg-red-bg'
              }`}
            >
              <Check size={24} className={isYes ? 'text-green' : 'text-red'} />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-0.5">
              Order {mode === 'buy' ? 'Placed' : 'Filled'}
            </h3>
            <p className="text-text-secondary text-sm">
              {mode === 'buy' ? 'Bought' : 'Sold'} {shares.toFixed(1)}{' '}
              {isYes ? 'Yes' : 'No'} shares at {price}¢
            </p>
            <button
              onClick={onClose}
              className="w-full mt-4 bg-text-primary text-bg-card font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer border-none"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Buy / Sell toggle */}
            <div className="flex bg-bg-input rounded-lg p-0.5">
              <button
                onClick={() => setMode('buy')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all border-none cursor-pointer ${
                  mode === 'buy'
                    ? 'bg-bg-card text-text-primary shadow-sm'
                    : 'bg-transparent text-text-muted'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setMode('sell')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all border-none cursor-pointer ${
                  mode === 'sell'
                    ? 'bg-bg-card text-text-primary shadow-sm'
                    : 'bg-transparent text-text-muted'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Yes / No toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSide('yes')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all border-2 cursor-pointer ${
                  isYes
                    ? 'bg-green-bg border-green text-green'
                    : 'bg-transparent border-border text-text-muted hover:border-green/40'
                }`}
              >
                Yes {market.confidence}¢
              </button>
              <button
                onClick={() => setSide('no')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all border-2 cursor-pointer ${
                  !isYes
                    ? 'bg-red-bg border-red text-red'
                    : 'bg-transparent border-border text-text-muted hover:border-red/40'
                }`}
              >
                No {100 - market.confidence}¢
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label
                htmlFor="trade-amount"
                className="block text-text-secondary text-xs font-medium mb-1.5"
              >
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  $
                </span>
                <input
                  id="trade-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-bg-input border border-border rounded-lg pl-7 pr-3 py-2.5 text-text-primary text-base font-semibold outline-none focus:border-blue transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[1, 5, 10, 25, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="flex-1 text-xs font-medium py-1.5 rounded-md bg-bg-input border border-border text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {/* Order summary */}
            {numAmount > 0 && (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Shares</span>
                  <span className="text-text-primary font-medium">
                    {shares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Avg price</span>
                  <span className="text-text-primary font-medium">
                    {price.toFixed(1)}¢
                  </span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between">
                  <span className="text-text-muted">
                    {mode === 'buy' ? 'Potential payout' : 'Est. return'}
                  </span>
                  <span className={`font-bold ${isYes ? 'text-green' : 'text-red'}`}>
                    ${potentialPayout.toFixed(2)}
                  </span>
                </div>
                {mode === 'buy' && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Return</span>
                    <span className="text-green font-bold">
                      +${potentialReturn.toFixed(2)} (+{returnPercent.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={numAmount <= 0 || submitting}
              className={`w-full font-semibold py-3 rounded-lg text-sm text-white transition-colors cursor-pointer border-none disabled:opacity-30 ${
                isYes
                  ? 'bg-green hover:bg-green/90'
                  : 'bg-red hover:bg-red/90'
              }`}
            >
              {submitting
                ? 'Processing...'
                : `${mode === 'buy' ? 'Buy' : 'Sell'} ${isYes ? 'Yes' : 'No'} — $${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
