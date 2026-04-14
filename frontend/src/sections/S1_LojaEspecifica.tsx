import { useQuery } from '@tanstack/react-query'
import { fanoutData } from '@/lib/fanout'
import WeeklyChart from '@/components/shared/WeeklyChart'
import S2_KpiCards from './S2_KpiCards'
import { Skeleton } from '@/components/ui/skeleton'
import { MONTHS_PT } from '@/lib/formatters'
import type { StoreKey } from '@/lib/types'

interface Props { store: StoreKey; year: number; month: number }

export default function S1_LojaEspecifica({ store, year, month }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['fat-vs-meta', store, year],
    queryFn: () => fanoutData([store], year, year),
  })

  const weeklyData = (data?.weekly ?? [])
    .filter(w => w.year === year && w.month === month)
    .map(w => ({
      label: `${w.start.slice(8)}/${w.start.slice(5,7)} a ${w.end.slice(8)}/${w.end.slice(5,7)}`,
      value: w.realizado,
      meta: w.meta,
    }))

  return (
    <section className="space-y-6">
      <S2_KpiCards source={store} year={year} month={month} />
      <div className="bg-card/40 border border-border/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border/40">
          Faturamento Semanal — {MONTHS_PT[month - 1]} {year}
        </h3>
        {isLoading ? <Skeleton className="h-48" /> : (
          <WeeklyChart data={weeklyData} height={200} />
        )}
      </div>
    </section>
  )
}
