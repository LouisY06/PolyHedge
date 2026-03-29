import { motion } from 'framer-motion'

interface Props {
  confidence: number
  delay?: number
}

export default function ConfidenceBar({ confidence, delay = 0 }: Props) {
  return (
    <div className="w-full h-[6px] rounded-full bg-bg-input overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: confidence >= 60
            ? 'linear-gradient(90deg, #22C55E, #10B981)'
            : confidence >= 40
            ? 'linear-gradient(90deg, #F59E0B, #EAB308)'
            : 'linear-gradient(90deg, #EF4444, #DC2626)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${confidence}%` }}
        transition={{ delay: delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}
