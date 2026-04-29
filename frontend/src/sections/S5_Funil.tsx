import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import FunnelChart from '@/components/shared/FunnelChart'
import { formatBRL } from '@/lib/formatters'
import type { StoreKey } from '@/lib/types'

interface FunnelStepRaw {
  key: string
  label: string
  description: string
  focus: string
  value: number
  stageRatePct: number
  cumulativeRatePct: number
  dropoffCount: number
  dropoffRatePct: number
}

interface ChannelPct {
  key: string
  label: string
  color: string
  pctByStep: {
    sessions: number
    engaged_sessions: number
    add_to_cart: number
    purchase: number
  }
}

interface FunnelResponse {
  source: string
  steps: FunnelStepRaw[]
  conversion: number
  engagement: number
  cartRate: number
  ticket: number
  isSample: boolean
  warning: string | null
  channelPcts?: ChannelPct[]
}

// Normalize channel pcts at a given step so they sum to exactly 1.0
function normalizeChannels(channels: { label: string; color: string; pct: number }[]) {
  const total = channels.reduce((a, c) => a + c.pct, 0)
  if (total === 0) return channels
  return channels.map(c => ({ ...c, pct: c.pct / total }))
}

interface Props { store: StoreKey; year: number; month: number }

export default function S5_Funil({ store, year, month }: Props) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate   = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data, isLoading } = useQuery({
    queryKey: ['funnel', store, year, month],
    queryFn: () => api.get<FunnelResponse>(`/funnel?source=${store}&start_date=${startDate}&end_date=${endDate}`),
  })

  if (isLoading) return <FunnelLoadingState />
  if (!data) return null

  const steps = data.steps ?? []
  if (!steps.length) return (
    <div className="bg-card/40 border border-border/65 rounded-xl p-5 text-center text-sm text-muted-foreground">
      Sem dados de funil para o período selecionado.
    </div>
  )

  const maxVal = steps[0]?.value ?? 1
  const channelPcts = data.channelPcts ?? []

  // Step key → metric key in channelPcts.pctByStep
  const stepKeyMap: Record<string, keyof ChannelPct['pctByStep']> = {
    sessions:         'sessions',
    engaged_sessions: 'engaged_sessions',
    add_to_cart:      'add_to_cart',
    purchase:         'purchase',
  }

  const funnelStages = steps.map(s => {
    const metricKey = stepKeyMap[s.key]
    const stageChannels = channelPcts.length > 0 && metricKey
      ? normalizeChannels(
          channelPcts.map(ch => ({
            label: ch.label,
            color: ch.color,
            pct: ch.pctByStep[metricKey] ?? 0,
          }))
        )
      : undefined

    return {
      label: s.label,
      value: s.value,
      displayPct: maxVal > 0 ? s.value / maxVal : 0,
      channels: stageChannels,
    }
  })

  const globalChannels = channelPcts.length > 0
    ? normalizeChannels(channelPcts.map(ch => ({ label: ch.label, color: ch.color, pct: ch.pctByStep.sessions })))
    : [{ label: 'Total', color: '#38bdf8', pct: 1 }]

  // Channel breakdown table
  const sessionsTotal = steps[0]?.value ?? 0
  const purchasesTotal = steps.find(s => s.key === 'purchase')?.value ?? 0
  const revenueTotal = purchasesTotal * (data.ticket ?? 0)

  const normSessions  = normalizeChannels(channelPcts.map(ch => ({ label: ch.label, color: ch.color, pct: ch.pctByStep.sessions })))
  const normPurchases = normalizeChannels(channelPcts.map(ch => ({ label: ch.label, color: ch.color, pct: ch.pctByStep.purchase })))

  const channelRows = channelPcts.map((ch, i) => ({
    label: ch.label,
    color: ch.color,
    sessions: Math.round(sessionsTotal * normSessions[i].pct),
    pct: normSessions[i].pct,
    revenue: revenueTotal * normPurchases[i].pct,
  })).sort((a, b) => b.sessions - a.sessions)

  return (
    <section className="bg-card/40 border border-border/65 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border/55">
        Funil de Conversão
      </h3>
      {data.warning && (
        <p className="text-xs text-amber-400 mb-3">{data.warning}</p>
      )}
      <FunnelChart stages={funnelStages} channels={globalChannels} height={400} />
      <div className="mt-4 grid grid-cols-3 gap-4 pt-3 border-t border-border/45">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Conversão</p>
          <p className="text-sm font-semibold text-foreground">{(data.conversion * 100).toFixed(2)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Engajamento</p>
          <p className="text-sm font-semibold text-foreground">{(data.engagement * 100).toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Taxa Carrinho</p>
          <p className="text-sm font-semibold text-foreground">{(data.cartRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      {channelRows.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border/45">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Breakdown por Canal
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/45">
                <th className="text-left pb-2 font-medium">Canal</th>
                <th className="text-right pb-2 font-medium">Sessões</th>
                <th className="text-right pb-2 font-medium">%</th>
                <th className="text-right pb-2 font-medium">Receita estimada</th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map(row => (
                <tr key={row.label} className="border-b border-border/35 last:border-0">
                  <td className="py-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                    <span className="text-foreground/90">{row.label}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground/80">
                    {row.sessions.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground/60">
                    {(row.pct * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-foreground/90">
                    {formatBRL(row.revenue)}
                  </td>
                </tr>
              ))}
              <tr className="text-xs text-muted-foreground font-semibold border-t border-border/55">
                <td className="pt-2">Total</td>
                <td className="pt-2 text-right tabular-nums">{sessionsTotal.toLocaleString('pt-BR')}</td>
                <td className="pt-2 text-right">100%</td>
                <td className="pt-2 text-right tabular-nums">{formatBRL(revenueTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function FunnelLoadingState() {
  return (
    <section className="rounded-xl border border-border/65 bg-card/40 p-5">
      <h3 className="border-b border-border/55 pb-2 text-sm font-semibold text-foreground">
        Funil de Conversão
      </h3>
      <div className="flex h-[420px] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400/25 border-t-sky-400" />
        <p className="text-sm font-medium text-foreground">Carregando Funil</p>
      </div>
    </section>
  )
}
