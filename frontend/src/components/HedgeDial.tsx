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
    if (value <= 20)
      return `Light hedge: ${value}% in prediction markets. Minimal protection, maximum upside.`
    if (value <= 50)
      return `Balanced: ${value}% hedged. Moderate protection while keeping most upside.`
    if (value <= 80)
      return `Heavy hedge: ${value}% in prediction markets. Strong protection, limited upside.`
    return `Max hedge: ${value}% in prediction markets. Near-full protection, very limited upside.`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-primary font-semibold">
          Hedge Ratio
        </label>
        <span className="text-sm font-bold text-accent-blue">{value}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #2563EB ${value}%, #E2E8F0 ${value}%)`,
        }}
        aria-label="Hedge percentage"
      />

      <div className="flex justify-between text-[10px] text-text-muted font-medium">
        <span>0% No hedge</span>
        <span>100% Full hedge</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg-primary border border-border rounded-xl p-2.5">
          <p className="text-[10px] text-text-muted font-medium">Stocks</p>
          <p className="text-base font-bold text-text-primary">{stockPercent}%</p>
        </div>
        <div className="bg-accent-green-light rounded-xl p-2.5">
          <p className="text-[10px] text-accent-green font-medium">Loss Reduced</p>
          <p className="text-base font-bold text-accent-green">-{lossReduction}%</p>
        </div>
        <div className="bg-accent-blue-light rounded-xl p-2.5">
          <p className="text-[10px] text-accent-blue font-medium">Upside Kept</p>
          <p className="text-base font-bold text-accent-blue">{upsideRetained}%</p>
        </div>
      </div>

      <p className="text-xs text-text-muted leading-relaxed bg-bg-primary border border-border rounded-xl p-3">
        {getTooltip()}
      </p>
    </div>
  )
}
