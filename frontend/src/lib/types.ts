// Existing types (keep from fanout / data layer)
export interface YearEntry {
  year: number
  meta: (number | null)[]
  realizado: (number | null)[]
  orderCounts: (number | null)[]
  orderTotal: number | null
  metaTotal: number | null
  realTotal: number | null
}

export interface WeeklyEntry {
  year: number; month: number; week: number
  start: string; end: string
  meta: number | null; realizado: number | null
}

export interface DataResponse {
  months: string[]; years: YearEntry[]; weekly: WeeklyEntry[]; apiSource: string
}

export interface ProductItem { name: string; quantity: number; revenue: number }
export interface MixItem { label: string; orders: number; sharePct: number; avgTicket?: number }
export interface ProductsResponse {
  items: ProductItem[]; itemsByRevenue: ProductItem[]; itemsByQuantity: ProductItem[]
  paymentMix: MixItem[]; shippingMix: MixItem[]
  source: string; period: string
}

export interface CustomerItem { name: string; revenue: number; orders: number }
export interface CustomersResponse { topCustomers: CustomerItem[]; source: string; period: string }

export interface OperationalOrder {
  orderNumber: string; orderDate: string; customerName: string; situacao: string
}
export interface OperationalCounts {
  missingLinkMarkerCount: number; openOverNDaysCount: number
  missingLinkMarkerOrders: OperationalOrder[]; openOverNDaysOrders: OperationalOrder[]
}
export interface ManagementResponse {
  operational: OperationalCounts; [key: string]: unknown
}

// New types for Dash_Final
export type StoreKey = 'all' | 'brewnh' | 'brewpoa' | 'brew' | 'bigb' | 'grow_fisica' | 'grow'
export type ViewMode = 'mensal' | 'anual'

export interface StoreOption {
  key: StoreKey
  label: string
  brand: 'brew' | 'grow' | 'all'
  isEcommerce?: boolean
}

export const STORE_LABELS: Record<string, string> = {
  all:        'Todas as Lojas',
  brewnh:     'Brew Loja NH',
  brewpoa:    'Brew Loja POA',
  brew:       'Brew Site',
  bigb:       'Big B',
  grow_fisica:'Grow Loja',
  grow:       'Grow Site',
}

export const STORE_OPTIONS: StoreOption[] = [
  { key: 'all',       label: 'Todas as Lojas',  brand: 'all' },
  { key: 'brewnh',    label: 'Brew Loja NH',    brand: 'brew' },
  { key: 'brewpoa',   label: 'Brew Loja POA',   brand: 'brew' },
  { key: 'brew',      label: 'Brew Site',       brand: 'brew',  isEcommerce: true },
  { key: 'grow_fisica', label: 'Grow Loja',     brand: 'grow' },
  { key: 'grow',      label: 'Grow Site',       brand: 'grow',  isEcommerce: true },
]

export interface MonthlyKpi {
  source: string; year: number; month: number
  revenue: number | null; orders: number | null; ticket: number | null
  revenue_delta_pct: number | null; orders_delta_abs: number | null
  ticket_delta_pct: number | null; target: number | null; gap_to_target: number | null
}

export interface FunnelStep {
  label: string; value: number
  channels: { label: string; value: number }[]
}
