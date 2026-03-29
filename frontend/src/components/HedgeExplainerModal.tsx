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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full p-7 max-h-[85vh] overflow-y-auto animate-fade-in-scale"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-text-muted hover:text-text-primary transition-colors bg-bg-page hover:bg-bg-hover w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2 className="text-[20px] font-extrabold text-text-primary mb-6">
          What is Hedging?
        </h2>

        <div className="space-y-6 text-[14px] text-text-secondary leading-relaxed">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
              <Shield size={18} className="text-green" />
            </div>
            <div>
              <h3 className="text-text-primary font-bold mb-1">Protection Against Loss</h3>
              <p>Hedging is like insurance for your investments. You allocate capital to positions that gain value when your main investments lose value.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
              <ArrowRightLeft size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="text-text-primary font-bold mb-1">How Prediction Markets Help</h3>
              <p>Prediction markets let you bet on real-world events. Take positions in markets related to your stocks to profit from events that would hurt your portfolio.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' }}>
              <TrendingDown size={18} className="text-purple" />
            </div>
            <div>
              <h3 className="text-text-primary font-bold mb-1">The Trade-Off</h3>
              <p>More hedging = less risk but less upside. The hedge dial lets you find the right balance.</p>
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)' }}>
            <h3 className="text-text-primary font-bold mb-2">Example</h3>
            <p className="text-[13px]">
              You own $10K of NVIDIA. Worried about chip export restrictions? A prediction market at 45% chance lets you profit if restrictions pass and NVIDIA drops — offsetting your loss.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-3d btn-3d-blue w-full mt-6 text-white font-bold py-3.5 rounded-xl text-[15px] cursor-pointer border-none"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
