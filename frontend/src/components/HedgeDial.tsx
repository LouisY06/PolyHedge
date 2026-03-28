interface Props {
  value: number
  onChange: (v: number) => void
}

export default function HedgeDial({ value, onChange }: Props) {
  const stockPercent = 100 - value
  const lossReduction = Math.round(value * 0.7)
  const upsideRetained = Math.round(stockPercent + value * 0.15)

  const getTooltip = () => {
    if (value === 0) return 'No hedge — fully exposed to market movements.'
    if (value <= 20) return `Light hedge: ${value}% in prediction markets.`
    if (value <= 50) return `Balanced: ${value}% hedged. Moderate protection.`
    if (value <= 80) return `Heavy hedge: ${value}% hedged. Strong protection.`
    return `Max hedge: ${value}% in prediction markets.`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-secondary font-medium">Hedge Ratio</label>
        <span className="text-sm font-bold text-blue">{value}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3B82F6 ${value}%, #E5E7EB ${value}%)`,
        }}
        aria-label="Hedge percentage"
      />

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-bg-input rounded-md py-2">
          <p className="text-[10px] text-text-muted">Stocks</p>
          <p className="text-sm font-bold text-text-primary">{stockPercent}%</p>
        </div>
        <div className="bg-green-bg rounded-md py-2">
          <p className="text-[10px] text-green">Loss ↓</p>
          <p className="text-sm font-bold text-green">-{lossReduction}%</p>
        </div>
        <div className="bg-blue-bg rounded-md py-2">
          <p className="text-[10px] text-blue">Upside</p>
          <p className="text-sm font-bold text-blue">{upsideRetained}%</p>
        </div>
      </div>

      <p className="text-xs text-text-muted leading-relaxed">{getTooltip()}</p>
    </div>
  )
}
