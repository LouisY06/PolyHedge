import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import type { Position } from '../../types'

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

interface Props {
  positions: Position[]
}

export default function AllocationDonut({ positions }: Props) {
  const data = positions.map((p) => ({
    name: p.ticker,
    value: p.marketValue,
  }))

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-4">
        <div className="w-[110px] h-[110px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
                animationBegin={200}
                animationDuration={1200}
                animationEasing="ease-out"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(30,41,59,0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  fontSize: '12px',
                }}
                formatter={(value, name) => [
                  `$${Number(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
                  String(name),
                ]}
                itemStyle={{ color: 'white', fontWeight: 600 }}
                labelStyle={{ display: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-semibold text-text-primary">{d.name}</span>
              </div>
              <span className="text-text-muted tabular-nums font-medium">
                {((d.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
