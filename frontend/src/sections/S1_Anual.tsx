import { useQueries } from '@tanstack/react-query'
import { fanoutData } from '@/lib/fanout'
import BarChartSimple from '@/components/shared/BarChartSimple'
import { Skeleton } from '@/components/ui/skeleton'
import { MONTHS_PT } from '@/lib/formatters'
import { STORE_LABELS } from '@/lib/types'
import type { StoreKey } from '@/lib/types'

const BREW_SOURCES = ['brewnh', 'brewpoa', 'brew', 'bigb']
const GROW_SOURCES = ['grow_fisica', 'grow']

interface AnnualBarProps {
  sources: string[]
  title: string
  subtitle: string
  year: number
  color: string
  yDomain: [number, number]
}

function AnnualBar({ sources, title, subtitle, year, color, yDomain }: AnnualBarProps) {
  const results = useQueries({
    queries: sources.map(s => ({
      queryKey: ['fat-vs-meta', s, year],
      queryFn: () => fanoutData([s], year, year),
    }))
  })
  if (results.some(r => r.isLoading)) return <Skeleton className="h-48" />
  const combined = MONTHS_PT.map((m, i) => ({
    label: m,
    value: results.reduce((a, r) => a + (r.data?.years.find(y => y.year === year)?.realizado[i] ?? 0), 0),
    meta: results[0]?.data?.years.find(y => y.year === year)?.meta[i] ?? null,
  }))
  return (
    <div className="bg-card/40 border border-border/65 rounded-xl p-4">
      <div className="text-center mb-3 pb-2 border-b border-border/55">
        <p className="text-lg font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <BarChartSimple data={combined} color={color} height={200} showMeta yDomain={yDomain} />
    </div>
  )
}

interface Props { store: StoreKey; year: number }

export default function S1_Anual({ store, year }: Props) {
  if (store === 'all') {
    return (
      <section className="grid grid-cols-[1fr_1px_1fr] gap-0">
        <div className="pr-6">
          <AnnualBar sources={BREW_SOURCES} title="Faturamento" subtitle="Brew · todas as lojas"
            year={year} color="#38bdf8" yDomain={[0, 500000]} />
        </div>
        <div className="bg-border/50" />
        <div className="pl-6">
          <AnnualBar sources={GROW_SOURCES} title="Faturamento" subtitle="Grow · todas as lojas"
            year={year} color="#34d399" yDomain={[0, 100000]} />
        </div>
      </section>
    )
  }
  const isBrew = ['brewnh', 'brewpoa', 'brew', 'bigb'].includes(store)
  const yDomain: [number, number] = store === 'brewnh' ? [0, 300000] : [0, 100000]
  return (
    <section>
      <AnnualBar sources={[store]} title="Faturamento" subtitle={STORE_LABELS[store] ?? store}
        year={year} color={isBrew ? '#38bdf8' : '#34d399'} yDomain={yDomain} />
    </section>
  )
}
