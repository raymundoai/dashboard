import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductsResponse, CustomersResponse, StoreKey, ViewMode } from '@/lib/types'

type ProductMetric = 'revenue' | 'quantity'

function pad(n: number) { return String(n).padStart(2, '0') }

function periodQuery(year: number, month: number, viewMode: ViewMode): string {
  if (viewMode === 'mensal') {
    const lastDay = new Date(year, month, 0).getDate()
    return `start_date=${year}-${pad(month)}-01&end_date=${year}-${pad(month)}-${pad(lastDay)}`
  }
  return `start_date=${year}-01-01&end_date=${year}-12-31`
}

function ProductList({ source, metric, year, month, viewMode }: {
  source: string; metric: ProductMetric; year: number; month: number; viewMode: ViewMode
}) {
  const pq = periodQuery(year, month, viewMode)
  const { data, isLoading } = useQuery({
    queryKey: ['products', source, year, month, viewMode],
    queryFn: () => api.get<ProductsResponse>(`/products?source=${source}&period=current_year&metric=revenue&${pq}`),
  })
  if (isLoading) return <Skeleton className="h-80" />
  const items = metric === 'revenue' ? (data?.itemsByRevenue ?? []) : (data?.itemsByQuantity ?? [])
  const rowBg  = 'hsl(var(--accent) / 0.4)'
  const stickyBg = 'hsl(var(--accent) / 0.92)'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '0 3px' }}>
        <tbody>
          {items.slice(0, 15).map((item, i) => (
            <tr key={item.name}>
              <td className="sticky left-0 z-10 text-xs text-muted-foreground text-right py-1.5 pl-2 pr-2 rounded-l-md" style={{ width: '2rem', background: stickyBg }}>
                {i + 1}
              </td>
              <td className="whitespace-nowrap py-1.5 px-2" style={{ background: rowBg }}>
                {item.name}
              </td>
              <td className="sticky right-0 z-10 font-medium text-right py-1.5 pl-4 pr-2 rounded-r-md" style={{ width: '7rem', minWidth: '7rem', background: stickyBg }}>
                {metric === 'revenue' ? formatBRL(item.revenue) : `${item.quantity.toLocaleString('pt-BR')} un.`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CustomerList({ source, year, month, viewMode }: {
  source: string; year: number; month: number; viewMode: ViewMode
}) {
  const pq = periodQuery(year, month, viewMode)
  const { data, isLoading } = useQuery({
    queryKey: ['customers', source, year, month, viewMode],
    queryFn: () => api.get<CustomersResponse>(`/customers?source=${source}&period=current_year&${pq}`),
  })
  if (isLoading) return <Skeleton className="h-80" />
  const rowBg    = 'hsl(var(--accent) / 0.4)'
  const stickyBg = 'hsl(var(--accent) / 0.92)'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '0 3px' }}>
        <tbody>
          {(data?.topCustomers ?? []).slice(0, 15).map((item, i) => (
            <tr key={item.name}>
              <td className="sticky left-0 z-10 text-xs text-muted-foreground text-right py-1.5 pl-2 pr-2 rounded-l-md" style={{ width: '2rem', background: stickyBg }}>
                {i + 1}
              </td>
              <td className="whitespace-nowrap py-1.5 px-2" style={{ background: rowBg }}>
                {item.name}
              </td>
              <td className="sticky right-0 z-10 text-right py-1.5 pl-4 pr-2 rounded-r-md" style={{ minWidth: '11rem', background: stickyBg }}>
                <span className="font-medium">{formatBRL(item.revenue)}</span>
                <span className="text-xs text-muted-foreground ml-2">{item.orders} ped.</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricToggle({ value, onChange }: { value: ProductMetric; onChange: (v: ProductMetric) => void }) {
  return (
    <div className="flex gap-1 bg-background border border-border/60 rounded-lg p-0.5">
      <button
        onClick={() => onChange('revenue')}
        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
          value === 'revenue' ? 'bg-sky-500/20 text-sky-400' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Faturamento
      </button>
      <button
        onClick={() => onChange('quantity')}
        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
          value === 'quantity' ? 'bg-sky-500/20 text-sky-400' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Quantidade
      </button>
    </div>
  )
}

interface PeriodProps { year: number; month: number; viewMode: ViewMode }

function BrandProductCard({ label, source, metric, onMetricChange, year, month, viewMode }: {
  label: string; source: string; metric: ProductMetric; onMetricChange: (v: ProductMetric) => void
} & PeriodProps) {
  const accent = label === 'Brew' ? '#38bdf8' : '#34d399'
  return (
    <div className="bg-card/40 border border-border/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
          {label} — Top 15 Produtos
        </h3>
        <MetricToggle value={metric} onChange={onMetricChange} />
      </div>
      <ProductList source={source} metric={metric} year={year} month={month} viewMode={viewMode} />
    </div>
  )
}

function BrandCustomerCard({ label, source, year, month, viewMode }: {
  label: string; source: string
} & PeriodProps) {
  const accent = label === 'Brew' ? '#38bdf8' : '#34d399'
  return (
    <div className="bg-card/40 border border-border/50 rounded-xl p-5">
      <h3 className="text-base font-bold text-foreground mb-3 pb-2 border-b border-border/40 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
        {label} — Top 15 Clientes
      </h3>
      <CustomerList source={source} year={year} month={month} viewMode={viewMode} />
    </div>
  )
}

function AllBrandsTopLists({ year, month, viewMode }: PeriodProps) {
  const [metricBrew, setMetricBrew] = useState<ProductMetric>('revenue')
  const [metricGrow, setMetricGrow] = useState<ProductMetric>('revenue')
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-0">
        <div className="pr-6">
          <BrandProductCard label="Brew" source="brew" metric={metricBrew} onMetricChange={setMetricBrew} year={year} month={month} viewMode={viewMode} />
        </div>
        <div className="bg-border/50" />
        <div className="pl-6">
          <BrandProductCard label="Grow" source="grow" metric={metricGrow} onMetricChange={setMetricGrow} year={year} month={month} viewMode={viewMode} />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-0">
        <div className="pr-6">
          <BrandCustomerCard label="Brew" source="brew" year={year} month={month} viewMode={viewMode} />
        </div>
        <div className="bg-border/50" />
        <div className="pl-6">
          <BrandCustomerCard label="Grow" source="grow" year={year} month={month} viewMode={viewMode} />
        </div>
      </div>
    </section>
  )
}

function SingleStoreTopLists({ store, year, month, viewMode }: { store: string } & PeriodProps) {
  const [metric, setMetric] = useState<ProductMetric>('revenue')
  return (
    <section className="grid grid-cols-2 gap-6">
      <div className="bg-card/40 border border-border/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">Top 15 Produtos</h3>
          <MetricToggle value={metric} onChange={setMetric} />
        </div>
        <ProductList source={store} metric={metric} year={year} month={month} viewMode={viewMode} />
      </div>
      <div className="bg-card/40 border border-border/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border/40">
          Top 15 Clientes
        </h3>
        <CustomerList source={store} year={year} month={month} viewMode={viewMode} />
      </div>
    </section>
  )
}

interface Props { store: StoreKey }
export default function S4_TopLists({ store, year, month, viewMode }: Props & PeriodProps) {
  if (store === 'all') return <AllBrandsTopLists year={year} month={month} viewMode={viewMode} />
  return <SingleStoreTopLists store={store} year={year} month={month} viewMode={viewMode} />
}
