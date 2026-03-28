import { useState } from 'react'
import { X, TrendingUp, TrendingDown, Check } from 'lucide-react'
import type { Market } from '../types'

interface Props {
  market: Market
  side: 'yes' | 'no'
  onClose: () => void
}

export default function TradeModal({ market, side, onClose }: Props) {
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
      aria-label={`Trade ${side} on ${market.title}`}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-bg-card border border-border rounded-2xl max-w-md w-full shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {isYes ? (
              <TrendingUp size={18} className="text-accent-green" />
            ) : (
              <TrendingDown size={18} className="text-accent-red" />
            )}
            <h2 className="text-base font-bold text-text-primary">
              Buy {isYes ? 'Yes' : 'No'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-accent-green-light flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-accent-green" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">
              Order Placed
            </h3>
            <p className="text-text-secondary text-sm mb-1">
              Bought {shares.toFixed(1)} {isYes ? 'Yes' : 'No'} shares at {price}¢
            </p>
            <p className="text-text-muted text-xs mb-5">
              {market.title}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-accent-blue text-white font-semibold py-3 rounded-xl text-sm hover:bg-accent-blue/90 transition-colors cursor-pointer border-none"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Market info */}
            <div className="bg-bg-primary border border-border rounded-xl p-3">
              <p className="text-sm font-medium text-text-primary leading-snug">
                {market.title}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-bg-card border border-border text-text-secondary font-medium">
                  {market.category}
                </span>
                <span className="text-xs text-text-muted">
                  ${(market.volume / 1_000_000).toFixed(1)}M vol
                </span>
              </div>
            </div>

            {/* Outcome + Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  Outcome
                </span>
              </div>
              <div
                className={`text-center px-4 py-1.5 rounded-lg ${
                  isYes ? 'bg-accent-green-light' : 'bg-accent-red-light'
                }`}
              >
                <span
                  className={`text-lg font-bold ${
                    isYes ? 'text-accent-green' : 'text-accent-red'
                  }`}
                >
                  {price}¢
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase ml-1 ${
                    isYes ? 'text-accent-green' : 'text-accent-red'
                  }`}
                >
                  {side}
                </span>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label
                htmlFor="trade-amount"
                className="block text-text-primary text-xs font-semibold mb-1.5"
              >
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">
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
                  className="w-full bg-bg-primary border border-border rounded-xl pl-7 pr-3 py-3 text-text-primary text-lg font-semibold outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue-light transition-all"
                  autoFocus
                />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-bg-primary border border-border text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {numAmount > 0 && (
              <div className="bg-bg-primary border border-border rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Shares</span>
                  <span className="text-text-primary font-semibold">
                    {shares.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Avg price</span>
                  <span className="text-text-primary font-semibold">
                    {price}¢
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-text-muted">Potential payout</span>
                  <span className="text-accent-green font-bold">
                    ${potentialPayout.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Potential return</span>
                  <span className="text-accent-green font-bold">
                    +${potentialReturn.toFixed(2)} (+{returnPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={numAmount <= 0 || submitting}
              className={`w-full font-semibold py-3 rounded-xl text-sm transition-colors cursor-pointer border-none focus:outline-none ${
                isYes
                  ? 'bg-accent-green text-white hover:bg-accent-green/90 focus:ring-2 focus:ring-accent-green-light'
                  : 'bg-accent-red text-white hover:bg-accent-red/90 focus:ring-2 focus:ring-accent-red-light'
              } disabled:opacity-30`}
            >
              {submitting
                ? 'Placing order...'
                : `Buy ${isYes ? 'Yes' : 'No'} — $${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
