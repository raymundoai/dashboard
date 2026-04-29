import { AlertTriangle, Calendar, Hash, User } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OperationalOrder } from '@/lib/types'

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const parsedDate = new Date(dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr)
  return Number.isNaN(parsedDate.getTime()) ? dateStr : parsedDate.toLocaleDateString('pt-BR')
}

export default function AlertOrdersDialog({
  open,
  onClose,
  title,
  orders,
  accentClass,
}: {
  open: boolean
  onClose: () => void
  title: string
  orders: OperationalOrder[]
  accentClass: string
}) {
  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl border-border/75 bg-card shadow-card-hover sm:max-w-2xl">
        <DialogHeader className="border-b border-border/65 pb-2">
          <DialogTitle className={`flex items-center gap-2 text-sm font-semibold ${accentClass}`}>
            <AlertTriangle className="h-4 w-4" />
            {title}
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {orders.length} pedido{orders.length !== 1 ? 's' : ''}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 max-h-[400px] overflow-y-auto px-1">
          {orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/55">
                  <th className="pb-2 pt-1 text-left text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Pedido
                    </span>
                  </th>
                  <th className="pb-2 pt-1 text-left text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Cliente
                    </span>
                  </th>
                  <th className="pb-2 pt-1 text-right text-xs font-medium text-muted-foreground">
                    <span className="flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      Data
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={index} className="row-hover border-b border-border/45 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-foreground">{order.orderNumber || '—'}</td>
                    <td className="max-w-[180px] truncate py-2.5 pr-4 text-muted-foreground">{order.customerName || '—'}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{formatDate(order.orderDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
