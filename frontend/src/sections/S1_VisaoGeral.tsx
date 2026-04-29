import { useQueries } from '@tanstack/react-query'
import { fanoutData } from '@/lib/fanout'
import DonutChart from '@/components/shared/DonutChart'
import { formatBRL } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import type { MixItem } from '@/lib/types'

const BREW_STORES = [
  { key: 'brewnh',  label: 'Loja NH',  color: '#7dd3fc' },
  { key: 'brewpoa', label: 'Loja POA', color: '#bae6fd' },
  { key: 'brew',    label: 'Site',     color: '#38bdf8' },
  { key: 'bigb',    label: 'Big B',    color: '#c084fc' },
]
const GROW_STORES = [
  { key: 'grow_fisica', label: 'Loja', color: '#6ee7b7' },
  { key: 'grow',        label: 'Site', color: '#34d399' },
]

interface BrandPanelProps { stores: typeof BREW_STORES; title: string; year: number; month: number }

function BrandPanel({ stores, title, year, month }: BrandPanelProps) {
  const results = useQueries({
    queries: stores.map(s => ({
      queryKey: ['fat-vs-meta', s.key, year],
      queryFn: () => fanoutData([s.key], year, year),
    }))
  })
  const isLoading = results.some(r => r.isLoading)
  if (isLoading) return <Skeleton className="h-64" />

  const rows = stores.map((s, i) => {
    const yearEntry = results[i].data?.years.find(y => y.year === year)
    const revenue = yearEntry?.realizado[month - 1] ?? null
    const orders  = yearEntry?.orderCounts[month - 1] ?? null
    const ticket  = revenue && orders ? revenue / orders : null
    return { ...s, revenue, orders, ticket }
  })

  const totRev = rows.reduce((a, r) => a + (r.revenue ?? 0), 0)
  const totOrd = rows.reduce((a, r) => a + (r.orders ?? 0), 0)
  const totTkt = totOrd ? totRev / totOrd : null

  const donutData: MixItem[] = rows.map(r => ({
    label: r.label, orders: r.orders ?? 0, sharePct: totOrd ? ((r.orders ?? 0) / totOrd) : 0,
  }))

  const accent = title === 'Brew' ? '#38bdf8' : '#34d399'
  return (
    <div className="bg-card/40 border border-border/65 rounded-xl p-5">
      <h3 className="text-base font-bold text-foreground mb-4 pb-2 border-b border-border/55 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
        {title}
      </h3>
      <div className="flex gap-6 items-start">
        <div className="w-48 shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Pedidos por canal — mês atual</p>
          <DonutChart data={donutData} title="" height={180} colors={rows.map(r => r.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/45">
                <th className="text-left py-1 font-medium">Canal</th>
                <th className="text-right py-1 font-medium">Faturamento</th>
                <th className="text-right py-1 font-medium">Pedidos</th>
                <th className="text-right py-1 font-medium">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-b border-border/35 hover:bg-accent/30">
                  <td className="py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    {r.label}
                  </td>
                  <td className="py-1.5 text-right font-medium">{r.revenue != null ? formatBRL(r.revenue) : '—'}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{r.orders ?? '—'}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{r.ticket != null ? formatBRL(r.ticket) : '—'}</td>
                </tr>
              ))}
              <tr className="font-semibold text-foreground border-t border-border/65">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{formatBRL(totRev)}</td>
                <td className="py-2 text-right">{totOrd}</td>
                <td className="py-2 text-right">{totTkt != null ? formatBRL(totTkt) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface Props { year: number; month: number }
export default function S1_VisaoGeral({ year, month }: Props) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-[1fr_1px_1fr] gap-0">
        <div className="pr-6"><BrandPanel stores={BREW_STORES} title="Brew" year={year} month={month} /></div>
        <div className="bg-border/50" />
        <div className="pl-6"><BrandPanel stores={GROW_STORES} title="Grow" year={year} month={month} /></div>
      </div>
    </section>
  )
}
