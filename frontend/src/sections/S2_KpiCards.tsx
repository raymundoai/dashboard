import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import type { MonthlyKpi, StoreKey } from '@/lib/types'

function Delta({ value, unit = '%', invert = false }: { value: number | null; unit?: string; invert?: boolean }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>
  const positive = invert ? value < 0 : value > 0
  return (
    <span className={`text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {value > 0 ? '+' : ''}{value}{unit}
    </span>
  )
}

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function KpiRow({ label, sources, year, month }: { label: string; sources: string[]; year: number; month: number }) {
  const vsLabel = `${MONTHS_SHORT[month - 1]} ${year - 1}`
  const query = useQuery({
    queryKey: ['kpis', sources.join(','), year, month],
    queryFn: async () => {
      const results = await Promise.all(
        sources.map(s => api.get<MonthlyKpi>(`/kpis?source=${s}&year=${year}&month=${month}`))
      )
      const merged: MonthlyKpi = results.reduce((acc, r) => ({
        ...acc,
        revenue: (acc.revenue ?? 0) + (r.revenue ?? 0),
        orders:  (acc.orders  ?? 0) + (r.orders  ?? 0),
        target:  acc.target != null && r.target != null ? acc.target + r.target : acc.target ?? r.target,
      }), { ...results[0], revenue: 0, orders: 0, target: null } as MonthlyKpi)
      merged.ticket = merged.orders ? (merged.revenue ?? 0) / merged.orders : null
      merged.gap_to_target = merged.target != null ? merged.target - (merged.revenue ?? 0) : null
      // Delta fields from results[0] are per-source only — not meaningful for aggregations
      if (sources.length > 1) {
        merged.revenue_delta_pct = null
        merged.orders_delta_abs = null
        merged.ticket_delta_pct = null
      }
      return merged
    }
  })

  if (query.isLoading) return <Skeleton className="h-28" />
  if (query.isError) return (
    <div className="h-28 rounded-xl border border-border/50 bg-card/40 flex items-center justify-center text-xs text-muted-foreground">
      Erro ao carregar dados
    </div>
  )
  const d = query.data
  if (!d) return null

  return (
    <div>
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</p>}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
          <p className="text-xl font-bold">{d.ticket != null ? formatBRL(d.ticket) : '—'}</p>
          <Delta value={d.ticket_delta_pct} />
          <span className="text-xs text-muted-foreground ml-1">{vsLabel}</span>
        </div>
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
          <p className="text-xl font-bold">{d.orders ?? '—'}</p>
          <Delta value={d.orders_delta_abs} unit="" />
          <span className="text-xs text-muted-foreground ml-1">{vsLabel}</span>
        </div>
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
          <p className="text-xl font-bold">{d.revenue != null ? formatBRL(d.revenue) : '—'}</p>
          {d.gap_to_target != null && (
            <p className="text-xs mt-1">
              <span className={d.gap_to_target <= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {d.gap_to_target <= 0 ? '✓ Meta atingida' : `Faltam ${formatBRL(d.gap_to_target)}`}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const BREW_SOURCES = ['brewnh', 'brewpoa', 'brew', 'bigb']
const GROW_SOURCES = ['grow_fisica', 'grow']

interface Props { source: StoreKey; year: number; month: number }
export default function S2_KpiCards({ source, year, month }: Props) {
  return (
    <section>
      {source === 'all' ? (
        <div className="grid grid-cols-2 gap-6">
          <KpiRow label="Brew" sources={BREW_SOURCES} year={year} month={month} />
          <KpiRow label="Grow" sources={GROW_SOURCES} year={year} month={month} />
        </div>
      ) : (
        <KpiRow label="" sources={[source]} year={year} month={month} />
      )}
    </section>
  )
}
