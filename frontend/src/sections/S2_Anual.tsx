import { useQueries } from '@tanstack/react-query'
import { fanoutData } from '@/lib/fanout'
import BarChartSimple from '@/components/shared/BarChartSimple'
import { Skeleton } from '@/components/ui/skeleton'
import { MONTHS_PT } from '@/lib/formatters'
import { STORE_LABELS } from '@/lib/types'
import type { StoreKey } from '@/lib/types'

const BREW_SOURCES = ['brewnh', 'brewpoa', 'brew', 'bigb']
const GROW_SOURCES = ['grow_fisica', 'grow']

function useAggregated(sources: string[], year: number) {
  const results = useQueries({
    queries: sources.map(s => ({
      queryKey: ['fat-vs-meta', s, year],
      queryFn: () => fanoutData([s], year, year),
    }))
  })
  const isLoading = results.some(r => r.isLoading)
  const yearRows = results.map(r => r.data?.years.find(y => y.year === year))
  const months = MONTHS_PT.map((m, i) => {
    const rev = yearRows.reduce((a, y) => a + (y?.realizado[i] ?? 0), 0)
    const ord = yearRows.reduce((a, y) => a + (y?.orderCounts[i] ?? 0), 0)
    return { label: m, revenue: rev, orders: ord, ticket: ord ? rev / ord : null }
  })
  return { isLoading, months }
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-3 pb-2 border-b border-border/40">
      <p className="text-lg font-bold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  )
}

interface Props { store: StoreKey; year: number }

export default function S2_Anual({ store, year }: Props) {
  const brewData = useAggregated(store === 'all' ? BREW_SOURCES : [store], year)
  const growData = useAggregated(store === 'all' ? GROW_SOURCES : [store], year)

  const ticketBrew = brewData.months.map(m => ({ label: m.label, value: m.ticket, meta: null }))
  const ticketGrow = growData.months.map(m => ({ label: m.label, value: m.ticket, meta: null }))
  const ordersBrew = brewData.months.map(m => ({ label: m.label, value: m.orders, meta: null }))
  const ordersGrow = growData.months.map(m => ({ label: m.label, value: m.orders, meta: null }))

  if (store !== 'all') {
    const isBrew = ['brewnh', 'brewpoa', 'brew', 'bigb'].includes(store)
    const color      = isBrew ? '#38bdf8' : '#34d399'
    const colorLight = isBrew ? '#7dd3fc' : '#6ee7b7'
    const subtitle   = STORE_LABELS[store] ?? store
    return (
      <section className="grid grid-cols-2 gap-6">
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <CardHeader title="Ticket Médio" subtitle={subtitle} />
          {brewData.isLoading ? <Skeleton className="h-40" /> : <BarChartSimple data={ticketBrew} color={color} height={160} />}
        </div>
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <CardHeader title="Pedidos" subtitle={subtitle} />
          {brewData.isLoading ? <Skeleton className="h-40" /> : <BarChartSimple data={ordersBrew} color={colorLight} height={160} />}
        </div>
      </section>
    )
  }

  return (
    <section className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <CardHeader title="Ticket Médio" subtitle="Brew · todas as lojas" />
          {brewData.isLoading ? <Skeleton className="h-40" /> : <BarChartSimple data={ticketBrew} color="#38bdf8" height={160} />}
        </div>
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <CardHeader title="Pedidos" subtitle="Brew · todas as lojas" />
          {brewData.isLoading ? <Skeleton className="h-40" /> : <BarChartSimple data={ordersBrew} color="#7dd3fc" height={160} />}
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <CardHeader title="Ticket Médio" subtitle="Grow · todas as lojas" />
          {growData.isLoading ? <Skeleton className="h-40" /> : <BarChartSimple data={ticketGrow} color="#34d399" height={160} />}
        </div>
        <div className="bg-card/40 border border-border/50 rounded-xl p-4">
          <CardHeader title="Pedidos" subtitle="Grow · todas as lojas" />
          {growData.isLoading ? <Skeleton className="h-40" /> : <BarChartSimple data={ordersGrow} color="#6ee7b7" height={160} />}
        </div>
      </div>
    </section>
  )
}
