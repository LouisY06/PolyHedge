import { X, Shield, TrendingDown, ArrowRightLeft } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function HedgeExplainerModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-bg-card border border-border rounded-xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0.5"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="text-base font-bold text-text-primary mb-4">
          What is Hedging?
        </h2>

        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-bg flex items-center justify-center flex-shrink-0">
              <Shield size={14} className="text-green" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-0.5 text-sm">
                Protection Against Loss
              </h3>
              <p className="text-xs">
                Hedging is like insurance for your investments. You allocate capital
                to positions that gain value when your main investments lose value.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-bg flex items-center justify-center flex-shrink-0">
              <ArrowRightLeft size={14} className="text-blue" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-0.5 text-sm">
                How Prediction Markets Help
              </h3>
              <p className="text-xs">
                Prediction markets let you bet on real-world events. Take positions
                in markets related to your stocks to profit from events that would
                hurt your portfolio.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-bg flex items-center justify-center flex-shrink-0">
              <TrendingDown size={14} className="text-red" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-0.5 text-sm">
                The Trade-Off
              </h3>
              <p className="text-xs">
                More hedging = less risk but less upside. The hedge dial lets you
                find the right balance.
              </p>
            </div>
          </div>

          <div className="bg-bg-page border border-border rounded-lg p-3">
            <h3 className="text-text-primary font-semibold mb-1 text-sm">Example</h3>
            <p className="text-xs">
              You own $10K of NVIDIA. Worried about chip export restrictions?
              A prediction market at 45% chance lets you profit if restrictions pass
              and NVIDIA drops — offsetting your loss.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-text-primary text-bg-card font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer border-none"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
