interface Props {
  value: number
  onChange: (v: number) => void
}

export default function HedgeDial({ value, onChange }: Props) {
  const stockPercent = 100 - value
  const lossReduction = Math.round(value * 0.7)
  const upsideRetained = Math.round(stockPercent + value * 0.15)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[12px] text-text-secondary font-bold uppercase tracking-wider">Hedge Ratio</label>
        <span className="text-[16px] font-extrabold tabular-nums gradient-text">{value}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3B82F6 0%, #8B5CF6 ${value}%, #E5E7EB ${value}%)`,
        }}
        aria-label="Hedge percentage"
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg-input rounded-xl py-3">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Stocks</p>
          <p className="text-[16px] font-extrabold text-text-primary tabular-nums mt-0.5">{stockPercent}%</p>
        </div>
        <div className="rounded-xl py-3" style={{ background: 'linear-gradient(180deg, #ECFDF5, #D1FAE5)' }}>
          <p className="text-[9px] text-green font-bold uppercase tracking-wider">Loss Reduced</p>
          <p className="text-[16px] font-extrabold text-green tabular-nums mt-0.5">-{lossReduction}%</p>
        </div>
        <div className="rounded-xl py-3" style={{ background: 'linear-gradient(180deg, #EFF6FF, #DBEAFE)' }}>
          <p className="text-[9px] text-blue font-bold uppercase tracking-wider">Upside</p>
          <p className="text-[16px] font-extrabold text-blue tabular-nums mt-0.5">{upsideRetained}%</p>
        </div>
      </div>
    </div>
  )
}
