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
      aria-label="What is hedging"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-bg-card border border-border rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-1"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-text-primary mb-5">
          What is Hedging?
        </h2>

        <div className="space-y-5 text-sm text-text-secondary leading-relaxed">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-green-light flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield size={16} className="text-accent-green" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-1">
                Protection Against Loss
              </h3>
              <p>
                Hedging is like insurance for your investments. You allocate a
                portion of your capital to positions that gain value when your
                main investments lose value.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-blue-light flex items-center justify-center flex-shrink-0 mt-0.5">
              <ArrowRightLeft size={16} className="text-accent-blue" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-1">
                How Prediction Markets Help
              </h3>
              <p>
                Prediction markets let you bet on real-world events. By taking
                positions in markets related to your stocks, you can profit from
                events that would hurt your portfolio.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-red-light flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingDown size={16} className="text-accent-red" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold mb-1">
                The Trade-Off
              </h3>
              <p>
                More hedging means less risk, but also less potential upside. The
                hedge dial lets you find the right balance.
              </p>
            </div>
          </div>

          <div className="bg-bg-primary border border-border rounded-xl p-4">
            <h3 className="text-text-primary font-semibold mb-2">Example</h3>
            <p>
              You own $10,000 of NVIDIA stock and you're worried about AI chip
              export restrictions. You find a prediction market at 45% chance.
              If restrictions pass and NVIDIA drops, your prediction market gains
              offset some of that loss.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-accent-blue text-white font-semibold py-3 rounded-xl text-sm hover:bg-accent-blue/90 transition-colors cursor-pointer border-none focus:ring-2 focus:ring-accent-blue-light focus:outline-none"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
