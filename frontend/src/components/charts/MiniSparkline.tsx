import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useMemo } from 'react'

interface Props {
  positive: boolean
  seed?: number
}

export default function MiniSparkline({ positive, seed = 0 }: Props) {
  const data = useMemo(() => {
    const points = []
    let val = 50
    // Use seed for deterministic-ish data per ticker
    let s = seed
    for (let i = 0; i < 20; i++) {
      s = (s * 9301 + 49297) % 233280
      const rand = s / 233280
      val += (rand - (positive ? 0.35 : 0.65)) * 8
      val = Math.max(val, 10)
      points.push({ i, v: val })
    }
    return points
  }, [positive, seed])

  const color = positive ? '#22C55E' : '#EF4444'

  return (
    <div className="w-[80px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${seed})`}
            animationDuration={800}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
