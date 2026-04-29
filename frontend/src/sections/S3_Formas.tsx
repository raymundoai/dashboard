import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import DonutChart from '@/components/shared/DonutChart'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductsResponse, StoreKey } from '@/lib/types'
import { formatBRL } from '@/lib/formatters'

const BREW_SOURCES = ['brewnh', 'brewpoa', 'brew', 'bigb']
const GROW_SOURCES = ['grow_fisica', 'grow']

function useAggregatedMix(sources: string[], type: 'payment' | 'shipping') {
  return useQuery({
    queryKey: ['formas', type, sources.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        sources.map(s => api.get<ProductsResponse>(`/products?source=${s}&period=current_year&metric=revenue`))
      )
      const mixKey = type === 'payment' ? 'paymentMix' : 'shippingMix'
      const combined = new Map<string, { orders: number; revenue: number }>()
      results.forEach(r => {
        ;(r[mixKey] ?? []).forEach(item => {
          const e = combined.get(item.label) ?? { orders: 0, revenue: 0 }
          combined.set(item.label, {
            orders: e.orders + item.orders,
            revenue: e.revenue + (item.avgTicket ?? 0) * item.orders,
          })
        })
      })
      const total = [...combined.values()].reduce((a, v) => a + v.orders, 0)
      return [...combined.entries()]
        .map(([label, v]) => ({
          label,
          orders: v.orders,
          revenue: v.revenue,
          sharePct: total ? v.orders / total : 0,
        }))
        .sort((a, b) => b.orders - a.orders)
    },
  })
}

type MixRow = { label: string; orders: number; revenue: number; sharePct: number }

function MixTable({ rows, showRevenue = true }: { rows: MixRow[]; showRevenue?: boolean }) {
  if (!rows.length) return null
  return (
    <table className="w-full text-xs mt-3 border-t border-border/45 pt-2">
      <thead>
        <tr className="text-muted-foreground">
          <th className="text-left py-1 font-medium">Forma</th>
          <th className="text-right py-1 font-medium">Pedidos</th>
          <th className="text-right py-1 font-medium">Part.</th>
          {showRevenue && <th className="text-right py-1 font-medium">Valor</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label} className="border-b border-border/35">
            <td className="py-1">{r.label}</td>
            <td className="py-1 text-right text-muted-foreground">{r.orders}</td>
            <td className="py-1 text-right text-muted-foreground">{(r.sharePct * 100).toFixed(1)}%</td>
            {showRevenue && <td className="py-1 text-right">{formatBRL(r.revenue)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BrandMixCard({ label, sources, type }: {
  label: string; sources: string[]; type: 'payment' | 'shipping'
}) {
  const mix = useAggregatedMix(sources, type)
  const accent = label === 'Brew' ? '#38bdf8' : '#34d399'
  const title = `${label} — Formas de ${type === 'payment' ? 'Pagamento' : 'Frete'}`
  return (
    <div className="bg-card/40 border border-border/65 rounded-xl p-5">
      <h3 className="text-base font-bold text-foreground mb-3 pb-2 border-b border-border/55 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
        {title}
      </h3>
      {mix.isLoading ? (
        <Skeleton className="h-56" />
      ) : mix.isError ? (
        <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">Erro ao carregar</div>
      ) : (
        <>
          <DonutChart data={mix.data ?? []} title="" height={200} />
          <MixTable rows={mix.data ?? []} showRevenue={type === 'payment'} />
        </>
      )}
    </div>
  )
}

function AllBrandsFormas() {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-0">
        <div className="pr-6"><BrandMixCard label="Brew" sources={BREW_SOURCES} type="payment" /></div>
        <div className="bg-border/50" />
        <div className="pl-6"><BrandMixCard label="Grow" sources={GROW_SOURCES} type="payment" /></div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-0">
        <div className="pr-6"><BrandMixCard label="Brew" sources={BREW_SOURCES} type="shipping" /></div>
        <div className="bg-border/50" />
        <div className="pl-6"><BrandMixCard label="Grow" sources={GROW_SOURCES} type="shipping" /></div>
      </div>
    </section>
  )
}

function SingleStoreFormas({ store }: { store: string }) {
  const payment  = useAggregatedMix([store], 'payment')
  const shipping = useAggregatedMix([store], 'shipping')

  return (
    <section className="grid grid-cols-2 gap-6">
      <div className="bg-card/40 border border-border/65 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border/55">
          Formas de Pagamento
        </h3>
        {payment.isLoading ? <Skeleton className="h-56" /> : payment.isError ? (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">Erro ao carregar</div>
        ) : (
          <>
            <DonutChart data={payment.data ?? []} title="" height={220} />
            <MixTable rows={payment.data ?? []} showRevenue={true} />
          </>
        )}
      </div>
      <div className="bg-card/40 border border-border/65 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border/55">
          Formas de Frete
        </h3>
        {shipping.isLoading ? <Skeleton className="h-56" /> : shipping.isError ? (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">Erro ao carregar</div>
        ) : (
          <>
            <DonutChart data={shipping.data ?? []} title="" height={220} />
            <MixTable rows={shipping.data ?? []} showRevenue={false} />
          </>
        )}
      </div>
    </section>
  )
}

interface Props { store: StoreKey }
export default function S3_Formas({ store }: Props) {
  if (store === 'all') return <AllBrandsFormas />
  return <SingleStoreFormas store={store} />
}
