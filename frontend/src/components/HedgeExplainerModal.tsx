import { motion } from 'framer-motion'
import { X, Shield, TrendingDown, ArrowRightLeft } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function HedgeExplainerModal({ onClose }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        className="relative bg-white rounded-2xl max-w-lg w-full p-7 max-h-[85vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <button onClick={onClose}
          className="absolute top-5 right-5 text-text-muted hover:text-text-primary transition-colors bg-bg-page hover:bg-bg-hover w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer"
        >
          <X size={16} />
        </button>

        <h2 className="text-[20px] font-extrabold text-text-primary mb-6">What is Hedging?</h2>

        <div className="space-y-6 text-[14px] text-text-secondary leading-relaxed">
          {[
            { icon: Shield, color: '#10B981', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', title: 'Protection Against Loss', text: 'Hedging is like insurance for your investments. You allocate capital to positions that gain value when your main investments lose value.' },
            { icon: ArrowRightLeft, color: '#3B82F6', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', title: 'How Prediction Markets Help', text: 'Prediction markets let you bet on real-world events. Take positions in markets related to your stocks to profit from events that would hurt your portfolio.' },
            { icon: TrendingDown, color: '#8B5CF6', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', title: 'The Trade-Off', text: 'More hedging = less risk but less upside. The hedge dial lets you find the right balance.' },
          ].map((item, i) => (
            <motion.div key={item.title} className="flex gap-4"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div>
                <h3 className="text-text-primary font-bold mb-1">{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </motion.div>
          ))}

          <motion.div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)' }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          >
            <h3 className="text-text-primary font-bold mb-2">Example</h3>
            <p className="text-[13px]">You own $10K of NVIDIA. Worried about chip export restrictions? A prediction market at 45% chance lets you profit if restrictions pass and NVIDIA drops — offsetting your loss.</p>
          </motion.div>
        </div>

        <motion.button onClick={onClose}
          className="btn-3d btn-3d-blue w-full mt-6 text-white font-bold py-3.5 rounded-xl text-[15px] cursor-pointer border-none"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        >
          Got it
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
