import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { motion } from 'framer-motion'

// Generate mock 30-day portfolio data with upward trend
function generateData() {
  const data = []
  let value = 48000
  for (let i = 0; i < 30; i++) {
    value += (Math.random() - 0.35) * 1200
    value = Math.max(value, 40000)
    data.push({ day: i + 1, value: Math.round(value * 100) / 100 })
  }
  // Ensure last point matches current total
  data[data.length - 1].value = 58396.25
  return data
}

const data = generateData()

export default function PortfolioChart() {
  return (
    <motion.div
      className="w-full h-[120px] mt-4"
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: 'bottom' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin - 2000', 'dataMax + 1000']} hide />
          <Tooltip
            contentStyle={{
              background: 'rgba(30,41,59,0.95)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
            labelStyle={{ display: 'none' }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Portfolio']}
            itemStyle={{ color: '#22C55E', fontWeight: 700, fontSize: '13px' }}
            cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22C55E"
            strokeWidth={2.5}
            fill="url(#portfolioGradient)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
