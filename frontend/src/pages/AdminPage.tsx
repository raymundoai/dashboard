import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowLeftCircle,
  ArrowRightCircle,
  CalendarClock,
  Globe2,
  Save,
  Store,
  Target,
  WalletCards,
} from 'lucide-react'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatBRL, formatNum } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

interface StoreData {
  target_revenue: number | null
  google_ads?: number | null
  meta_ads?: number | null
}

interface MonthlyResponse {
  year: number
  month: number
  stores: Record<string, StoreData>
}

interface StoreConfigEntry {
  code: string
  label: string
  brand: 'brew' | 'grow'
  kind: 'physical' | 'ecommerce'
}

interface SaveFeedback {
  tone: 'success' | 'error'
  text: string
}

const STORE_CONFIG: StoreConfigEntry[] = [
  { code: 'brewnh', label: 'Brew NH', brand: 'brew', kind: 'physical' },
  { code: 'brewpoa', label: 'Brew POA', brand: 'brew', kind: 'physical' },
  { code: 'bigb', label: 'Big B', brand: 'brew', kind: 'physical' },
  { code: 'brew', label: 'Brew Site', brand: 'brew', kind: 'ecommerce' },
  { code: 'grow_fisica', label: 'Grow Loja', brand: 'grow', kind: 'physical' },
  { code: 'grow', label: 'Grow Site', brand: 'grow', kind: 'ecommerce' },
]

const BRAND_META = {
  brew: {
    label: 'Brew',
    accent: 'text-sky-300',
    border: 'border-sky-500/20',
    surface: 'bg-sky-500/10',
    badge: 'border-sky-400/30 text-sky-300 bg-sky-500/10',
  },
  grow: {
    label: 'Grow',
    accent: 'text-emerald-300',
    border: 'border-emerald-500/20',
    surface: 'bg-emerald-500/10',
    badge: 'border-emerald-400/30 text-emerald-300 bg-emerald-500/10',
  },
} as const

function cloneStores(stores: Record<string, StoreData>): Record<string, StoreData> {
  return JSON.parse(JSON.stringify(stores))
}

function fmtInput(value: number | null | undefined): string {
  if (value == null) return ''
  return String(value)
}

function sumNullable(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function countFilled(values: Array<number | null | undefined>): number {
  return values.reduce<number>((count, value) => count + (value != null ? 1 : 0), 0)
}

function getPeriodState(year: number, month: number): { label: string; variant: 'outline' | 'secondary' | 'destructive' } {
  const now = new Date()
  const selectedKey = year * 12 + month
  const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1)

  if (selectedKey > currentKey) return { label: 'Planejamento futuro', variant: 'secondary' }
  if (selectedKey === currentKey) return { label: 'Mês atual', variant: 'outline' }
  return { label: 'Mês passado', variant: 'destructive' }
}

function sameNumber(left: number | null | undefined, right: number | null | undefined): boolean {
  return (left ?? null) === (right ?? null)
}

function countChangedStores(
  current: Record<string, StoreData> | undefined,
  draft: Record<string, StoreData>,
): number {
  if (!current) return 0

  return STORE_CONFIG.reduce((count, store) => {
    const currentStore = current[store.code] ?? {}
    const draftStore = draft[store.code] ?? {}

    const changed =
      !sameNumber(currentStore.target_revenue, draftStore.target_revenue) ||
      (store.kind === 'ecommerce' &&
        (!sameNumber(currentStore.google_ads, draftStore.google_ads) ||
          !sameNumber(currentStore.meta_ads, draftStore.meta_ads)))

    return count + (changed ? 1 : 0)
  }, 0)
}

function getYearOptions(selectedYear: number): number[] {
  const currentYear = new Date().getFullYear()
  const start = Math.min(currentYear - 1, selectedYear - 1)
  const end = Math.max(currentYear + 4, selectedYear + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function LoadingRows({ columns, rows = 3 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-10 w-full rounded-lg" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function MoneyInput({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string
  disabled: boolean
  placeholder: string
  onChange: (value: string) => void
}) {
  if (disabled) {
    return <Skeleton className="h-10 w-full rounded-lg" />
  }

  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 text-right text-sm"
    />
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: typeof Target
  tone?: 'default' | 'warn'
}) {
  return (
    <Card className={cn('border-border/60 bg-card/70', tone === 'warn' && 'border-amber-500/25 bg-amber-500/6')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-1 text-2xl font-semibold">{value}</CardTitle>
          </div>
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80',
            tone === 'warn' && 'border-amber-500/20 bg-amber-500/10 text-amber-300',
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function BrandSection({
  brand,
  draft,
  isLoading,
  onFieldChange,
}: {
  brand: 'brew' | 'grow'
  draft: Record<string, StoreData>
  isLoading: boolean
  onFieldChange: (code: string, field: keyof StoreData, raw: string) => void
}) {
  const brandMeta = BRAND_META[brand]
  const physicalStores = STORE_CONFIG.filter(store => store.brand === brand && store.kind === 'physical')
  const ecommerceStores = STORE_CONFIG.filter(store => store.brand === brand && store.kind === 'ecommerce')

  const physicalTargetTotal = sumNullable(physicalStores.map(store => draft[store.code]?.target_revenue))
  const ecommerceTargetTotal = sumNullable(ecommerceStores.map(store => draft[store.code]?.target_revenue))
  const mediaTotal = sumNullable(
    ecommerceStores.flatMap(store => [draft[store.code]?.google_ads, draft[store.code]?.meta_ads]),
  )

  return (
    <Card className={cn('border-border/60 bg-card/70', brandMeta.border)}>
      <CardHeader className={cn('border-b border-border/50 pb-4', brandMeta.surface)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={cn('text-xl font-semibold', brandMeta.accent)}>{brandMeta.label}</CardTitle>
              <Badge variant="outline" className={brandMeta.badge}>
                {physicalStores.length + ecommerceStores.length} lojas
              </Badge>
            </div>
            <CardDescription className="mt-1">
              Defina as metas do mês e, nos sites, complete também o orçamento de mídia.
            </CardDescription>
          </div>

          <div className="grid min-w-[220px] gap-2 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
              <span className="text-muted-foreground">Meta total</span>
              <span className="font-medium text-foreground">{formatBRL(physicalTargetTotal + ecommerceTargetTotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
              <span className="text-muted-foreground">Mídia planejada</span>
              <span className="font-medium text-foreground">{formatBRL(mediaTotal)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Lojas físicas</p>
              <p className="text-sm text-muted-foreground">Aqui você define apenas a meta mensal de faturamento.</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Meta mensal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <LoadingRows columns={2} />
              ) : (
                physicalStores.map(store => (
                  <TableRow key={store.code}>
                    <TableCell>
                      <div className="font-medium text-foreground">{store.label}</div>
                    </TableCell>
                    <TableCell className="w-[220px]">
                      <MoneyInput
                        value={fmtInput(draft[store.code]?.target_revenue)}
                        disabled={false}
                        placeholder="Meta em R$"
                        onChange={value => onFieldChange(store.code, 'target_revenue', value)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {!isLoading && (
              <TableFooter>
                <TableRow>
                  <TableCell>Total lojas físicas</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(physicalTargetTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">E-commerce</p>
              <p className="text-sm text-muted-foreground">
                Além da meta mensal, preencha a verba de Google Ads e Meta Ads para o mês futuro.
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Meta mensal</TableHead>
                <TableHead className="text-right">Google Ads</TableHead>
                <TableHead className="text-right">Meta Ads</TableHead>
                <TableHead className="text-right">Mídia total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <LoadingRows columns={5} rows={Math.max(1, ecommerceStores.length)} />
              ) : (
                ecommerceStores.map(store => {
                  const mediaRowTotal = sumNullable([draft[store.code]?.google_ads, draft[store.code]?.meta_ads])
                  return (
                    <TableRow key={store.code}>
                      <TableCell>
                        <div className="font-medium text-foreground">{store.label}</div>
                        <div className="text-xs text-muted-foreground">Site com orçamento de mídia</div>
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <MoneyInput
                          value={fmtInput(draft[store.code]?.target_revenue)}
                          disabled={false}
                          placeholder="Meta em R$"
                          onChange={value => onFieldChange(store.code, 'target_revenue', value)}
                        />
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <MoneyInput
                          value={fmtInput(draft[store.code]?.google_ads)}
                          disabled={false}
                          placeholder="Google Ads"
                          onChange={value => onFieldChange(store.code, 'google_ads', value)}
                        />
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <MoneyInput
                          value={fmtInput(draft[store.code]?.meta_ads)}
                          disabled={false}
                          placeholder="Meta Ads"
                          onChange={value => onFieldChange(store.code, 'meta_ads', value)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(mediaRowTotal)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            {!isLoading && (
              <TableFooter>
                <TableRow>
                  <TableCell>Total e-commerce</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(ecommerceTargetTotal)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBRL(sumNullable(ecommerceStores.map(store => draft[store.code]?.google_ads)))}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBRL(sumNullable(ecommerceStores.map(store => draft[store.code]?.meta_ads)))}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(mediaTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const now = new Date()
  const queryClient = useQueryClient()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [draft, setDraft] = useState<Record<string, StoreData>>({})
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null)

  function prevMonth() {
    setSaveFeedback(null)
    if (month === 1) {
      setYear(currentYear => currentYear - 1)
      setMonth(12)
      return
    }
    setMonth(currentMonth => currentMonth - 1)
  }

  function nextMonth() {
    setSaveFeedback(null)
    if (month === 12) {
      setYear(currentYear => currentYear + 1)
      setMonth(1)
      return
    }
    setMonth(currentMonth => currentMonth + 1)
  }

  const { data, isLoading, isError } = useQuery<MonthlyResponse>({
    queryKey: ['admin-monthly', year, month],
    queryFn: () => api.get<MonthlyResponse>(`/admin/monthly?year=${year}&month=${month}`),
  })

  useEffect(() => {
    if (data) setDraft(cloneStores(data.stores))
  }, [data])

  const save = useMutation({
    mutationFn: () => api.post('/admin/monthly', { year, month, stores: draft }),
    onSuccess: async () => {
      setSaveFeedback({ tone: 'success', text: 'Planejamento salvo com sucesso.' })
      await queryClient.invalidateQueries({ queryKey: ['admin-monthly', year, month] })
    },
    onError: () => {
      setSaveFeedback({ tone: 'error', text: 'Erro ao salvar. Revise os campos e tente novamente.' })
    },
  })

  function setField(code: string, field: keyof StoreData, raw: string) {
    setSaveFeedback(null)
    const normalized = raw.trim()
    const parsed = normalized === '' ? null : Number(normalized)
    setDraft(currentDraft => ({
      ...currentDraft,
      [code]: {
        ...currentDraft[code],
        [field]: Number.isNaN(parsed) ? null : parsed,
      },
    }))
  }

  const currentStores = data?.stores
  const pendingStores = countChangedStores(currentStores, draft)
  const hasChanges = pendingStores > 0
  const periodState = getPeriodState(year, month)
  const yearOptions = getYearOptions(year)

  const allTargetValues = STORE_CONFIG.map(store => draft[store.code]?.target_revenue)
  const allMediaValues = STORE_CONFIG.flatMap(store =>
    store.kind === 'ecommerce' ? [draft[store.code]?.google_ads, draft[store.code]?.meta_ads] : [],
  )

  const filledTargets = countFilled(allTargetValues)
  const filledMediaFields = countFilled(allMediaValues)
  const totalMediaFields = STORE_CONFIG.filter(store => store.kind === 'ecommerce').length * 2

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </a>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Planejamento mensal de metas</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Use esta área para configurar manualmente as metas futuras de cada loja. Nos e-commerces,
              complete também os valores de Google Ads e Meta Ads do mês.
            </p>
          </div>
        </div>

        <Badge variant={periodState.variant}>{periodState.label}</Badge>
      </div>

      <Card className="border-border/60 bg-card/75">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl font-semibold">
                  {MONTH_NAMES[month - 1]} de {year}
                </CardTitle>
              </div>
              <CardDescription>
                Navegue entre os meses para preparar o planejamento antes do início de cada operação.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ArrowLeftCircle className="h-4 w-4" />
                Mês anterior
              </Button>

              <select
                value={month}
                onChange={event => {
                  setSaveFeedback(null)
                  setMonth(Number(event.target.value))
                }}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                {MONTH_NAMES.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={event => {
                  setSaveFeedback(null)
                  setYear(Number(event.target.value))
                }}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              >
                {yearOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <Button variant="outline" size="sm" onClick={nextMonth}>
                Próximo mês
                <ArrowRightCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-background/60 p-4">
            <p className="text-sm font-medium text-foreground">Como usar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Preencha o faturamento esperado de cada loja. Nos sites, informe também a verba de mídia do mês.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/60 p-4">
            <p className="text-sm font-medium text-foreground">Lojas físicas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Trabalham apenas com campo de meta mensal. Não exigem orçamento de mídia.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/60 p-4">
            <p className="text-sm font-medium text-foreground">E-commerce</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Planeje meta mensal, Google Ads e Meta Ads para deixar o mês pronto antes da execução.
            </p>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Erro ao carregar as configurações do mês. Recarregue a página e tente novamente.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Meta total Brew"
          value={formatBRL(sumNullable(
            STORE_CONFIG.filter(store => store.brand === 'brew').map(store => draft[store.code]?.target_revenue),
          ))}
          description="Soma das metas das lojas Brew neste mês."
          icon={Target}
        />
        <SummaryCard
          title="Meta total Grow"
          value={formatBRL(sumNullable(
            STORE_CONFIG.filter(store => store.brand === 'grow').map(store => draft[store.code]?.target_revenue),
          ))}
          description="Soma das metas das lojas Grow neste mês."
          icon={Target}
        />
        <SummaryCard
          title="Mídia planejada"
          value={formatBRL(sumNullable(allMediaValues))}
          description={`${filledMediaFields}/${formatNum(totalMediaFields)} campos de mídia preenchidos.`}
          icon={WalletCards}
        />
        <SummaryCard
          title="Alterações pendentes"
          value={formatNum(pendingStores)}
          description={hasChanges
            ? 'Existem lojas com ajustes ainda não salvos.'
            : `${filledTargets}/${formatNum(STORE_CONFIG.length)} metas de faturamento preenchidas.`}
          icon={Save}
          tone={hasChanges ? 'warn' : 'default'}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <BrandSection brand="brew" draft={draft} isLoading={isLoading && !data} onFieldChange={setField} />
        <BrandSection brand="grow" draft={draft} isLoading={isLoading && !data} onFieldChange={setField} />
      </section>

      <Card className="border-border/60 bg-card/75">
        <CardFooter className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Salvar planejamento do mês</p>
            <p className="text-sm text-muted-foreground">
              Os valores ficam gravados para {MONTH_NAMES[month - 1].toLowerCase()} de {year} e alimentam o painel administrativo.
            </p>
            {saveFeedback && (
              <p className={cn(
                'text-sm',
                saveFeedback.tone === 'success' ? 'text-emerald-300' : 'text-red-300',
              )}>
                {saveFeedback.text}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                {pendingStores} loja{pendingStores > 1 ? 's' : ''} com alteração pendente
              </Badge>
            )}
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || isLoading || !hasChanges}
              size="lg"
              className="min-w-[180px]"
            >
              <Save className="h-4 w-4" />
              {save.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
