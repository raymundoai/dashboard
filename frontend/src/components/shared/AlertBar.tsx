import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import type { OperationalCounts, OperationalOrder } from '@/lib/types'

const AlertOrdersDialog = lazy(() => import('@/components/shared/AlertOrdersDialog'))

// AlertBar self-fetches from /api/management?source=all (operational alerts are network-wide)
export default function AlertBar() {
  const [openMissing, setOpenMissing] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)

  const { data } = useQuery<OperationalCounts>({
    queryKey: ['operational'],
    queryFn: () => api.get<OperationalCounts>('/operational'),
    staleTime: 5 * 60 * 1000,
  })

  const missingSemLoja = data?.missingLinkMarkerCount ?? 0
  const pedidosEmAberto = data?.openOverNDaysCount ?? 0
  const missingOrders: OperationalOrder[] = data?.missingLinkMarkerOrders ?? []
  const openOrders: OperationalOrder[] = data?.openOverNDaysOrders ?? []

  if (missingSemLoja === 0 && pedidosEmAberto === 0) return null

  return (
    <>
      <div className="flex gap-3 mt-8">
        {missingSemLoja > 0 && (
          <button
            onClick={() => setOpenMissing(true)}
            className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3 bg-red-500/5 border border-red-500/15 transition-all hover:bg-red-500/10 hover:border-red-500/25 cursor-pointer text-left"
          >
            <AlertTriangle className="h-4 w-4 text-red-400/80 shrink-0" />
            <span className="text-sm text-red-300/80">
              <strong className="font-semibold text-red-300">{missingSemLoja}</strong>{' '}
              pedido{missingSemLoja !== 1 ? 's' : ''} sem loja atribuída
            </span>
            <span className="ml-auto text-xs text-red-400/50">ver →</span>
          </button>
        )}
        {pedidosEmAberto > 0 && (
          <button
            onClick={() => setOpenOpen(true)}
            className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3 bg-amber-500/5 border border-amber-500/15 transition-all hover:bg-amber-500/10 hover:border-amber-500/25 cursor-pointer text-left"
          >
            <AlertTriangle className="h-4 w-4 text-amber-400/80 shrink-0" />
            <span className="text-sm text-amber-300/80">
              <strong className="font-semibold text-amber-300">{pedidosEmAberto}</strong>{' '}
              pedido{pedidosEmAberto !== 1 ? 's' : ''} em aberto há mais de 1 dia
            </span>
            <span className="ml-auto text-xs text-amber-400/50">ver →</span>
          </button>
        )}
      </div>

      <Suspense fallback={null}>
        {(openMissing || openOpen) && (
          <>
            <AlertOrdersDialog
              open={openMissing}
              onClose={() => setOpenMissing(false)}
              title="Pedidos sem loja atribuída"
              orders={missingOrders}
              accentClass="text-red-400"
            />
            <AlertOrdersDialog
              open={openOpen}
              onClose={() => setOpenOpen(false)}
              title="Pedidos em aberto há mais de 1 dia"
              orders={openOrders}
              accentClass="text-amber-400"
            />
          </>
        )}
      </Suspense>
    </>
  )
}
