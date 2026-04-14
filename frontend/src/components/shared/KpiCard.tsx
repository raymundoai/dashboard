import { Card, CardContent } from '@/components/ui/card'
import { formatBRL, formatPct, formatNum } from '@/lib/formatters'

interface Props {
  label: string
  value: string | number | null
  delta?: number | null
  unit?: 'brl' | 'pct' | 'num'
  subtitle?: string
}

export default function KpiCard({ label, value, delta, unit = 'brl', subtitle }: Props) {
  const formatted =
    value == null ? '—'
    : unit === 'brl' ? formatBRL(Number(value))
    : unit === 'pct' ? `${Number(value).toFixed(1)}%`
    : unit === 'num' ? formatNum(Number(value))
    : String(value)

  const deltaPositive = delta != null && delta >= 0
  const deltaColor = delta == null ? '' : deltaPositive ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'
  const deltaArrow = delta == null ? '' : deltaPositive ? '↑' : '↓'

  return (
    <Card className="card-hover bg-card border-border shadow-card cursor-default select-none">
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs font-medium text-muted-foreground tracking-wide mb-3">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-bold text-foreground leading-none">{formatted}</p>
          {delta != null && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${deltaColor}`}>
              {deltaArrow} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
