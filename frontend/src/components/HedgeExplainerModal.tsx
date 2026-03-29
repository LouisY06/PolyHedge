import { X } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function HedgeExplainerModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
        >
          <X size={16} />
        </button>

        <h2 className="text-[16px] font-medium text-text-primary mb-4">Hedging with prediction markets</h2>

        <div className="text-[13px] text-text-secondary leading-relaxed space-y-4">
          <p>
            When you own stocks, you're exposed to events that could hurt their value. Hedging means taking a second position that pays off if those bad events happen.
          </p>

          <p>
            Prediction markets price real-world outcomes — elections, regulations, earnings. If you find a market tied to a risk your portfolio faces, buying shares in that market can offset losses in your stocks.
          </p>

          <p>
            Say you hold NVIDIA and you're worried about export restrictions. If there's a prediction market trading at 40% for "US bans chip exports", you can buy YES shares. If the ban happens and NVIDIA drops, your prediction market position goes up.
          </p>

          <p className="text-text-muted text-[12px]">
            The tradeoff: money you put into hedges is money not fully invested in your stocks. It's a balance between protection and growth.
          </p>
        </div>

        <button onClick={onClose}
          className="w-full mt-5 text-text-primary font-medium py-2.5 rounded-lg text-[13px] cursor-pointer border border-border bg-white hover:bg-bg-hover transition-colors duration-150"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
