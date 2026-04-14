import { useMutation, useQueryClient } from '@tanstack/react-query'
import { STORE_OPTIONS, type StoreKey, type ViewMode } from '@/lib/types'
import { api } from '@/lib/api'
import { coerceYearForStore, getAvailableYears } from '@/lib/yearRange'
import type { SyncState } from '@/App'

interface Props {
  store: StoreKey
  year: number
  month: number
  viewMode: ViewMode
  role: 'admin' | 'viewer' | null
  syncState: SyncState
  syncError: string | null
  onSyncClick: () => void
  onStoreChange: (s: StoreKey) => void
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
  onViewModeChange: (v: ViewMode) => void
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function GlobalHeader({
  store, year, month, viewMode, role,
  syncState, syncError, onSyncClick,
  onStoreChange, onYearChange, onMonthChange, onViewModeChange,
}: Props) {
  const isMensal = viewMode === 'mensal'
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const years = getAvailableYears(store, currentYear)

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/login'
    },
  })

  const syncLabel = {
    idle:    '↻ Sincronizar',
    running: 'Sincronizando…',
    done:    '✓ Atualizado',
    error:   '✕ Erro',
  }[syncState]

  const syncClass = {
    idle:    'text-muted-foreground hover:text-foreground border-border/40 hover:border-border/80',
    running: 'text-sky-400 border-sky-500/30 opacity-70 cursor-not-allowed',
    done:    'text-emerald-400 border-emerald-500/30',
    error:   'text-red-400 border-red-500/30',
  }[syncState]

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-6 py-3
      bg-background/80 backdrop-blur border-b border-border/50 flex-wrap">

      {/* Brand */}
      <span className="text-sm font-semibold mr-2">
        <span className="text-sky-400">Brew</span>
        <span className="text-muted-foreground mx-1">·</span>
        <span className="text-emerald-400">Grow</span>
      </span>

      {/* Store selector */}
      <select
        value={store}
        onChange={e => onStoreChange(e.target.value as StoreKey)}
        className="text-sm bg-card border border-border/60 rounded-lg px-3 py-1.5
          text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-border"
      >
        {STORE_OPTIONS.map(o => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>

      {/* Month picker (mensal only) */}
      {isMensal && (
        <select
          value={month}
          onChange={e => onMonthChange(Number(e.target.value))}
          className="text-sm bg-card border border-border/60 rounded-lg px-3 py-1.5
            text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-border"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      )}

      {/* Year picker */}
      <select
        value={year}
        onChange={e => onYearChange(coerceYearForStore(store, Number(e.target.value), currentYear))}
        className="text-sm bg-card border border-border/60 rounded-lg px-3 py-1.5
          text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-border"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {/* Mensal / Anual toggle */}
      <button
        role="switch"
        aria-checked={isMensal}
        onClick={() => onViewModeChange(isMensal ? 'anual' : 'mensal')}
        className={`relative flex items-center rounded-full p-1 h-9 w-36 border
          transition-all duration-300 cursor-pointer select-none
          ${isMensal
            ? 'bg-sky-500/10 border-sky-500/30'
            : 'bg-amber-500/10 border-amber-500/30'}`}
      >
        <span className={`absolute top-1 h-7 w-[62px] rounded-full transition-all duration-300
          ${isMensal
            ? 'left-1 bg-sky-500/20 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
            : 'left-[70px] bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]'}`}
        />
        <span className={`relative z-10 flex-1 text-center text-xs font-semibold transition-colors
          ${isMensal ? 'text-sky-400' : 'text-sky-400/30'}`}>Mensal</span>
        <span className={`relative z-10 flex-1 text-center text-xs font-semibold transition-colors
          ${!isMensal ? 'text-amber-400' : 'text-amber-400/30'}`}>Anual</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auth actions (only when authenticated) */}
      {role !== null && (
        <div className="flex items-center gap-3">
          {/* Sync button */}
          <button
            onClick={onSyncClick}
            disabled={syncState === 'running'}
            title={syncError ?? undefined}
            className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${syncClass}`}
          >
            {syncState === 'running' && (
              <span className="inline-block w-3 h-3 border border-sky-400 border-t-transparent
                rounded-full animate-spin mr-1.5 align-middle" />
            )}
            {syncLabel}
          </button>

          {role === 'admin' && (
            <a
              href="/admin"
              className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20
                hover:bg-sky-500/20 transition-colors px-3 py-1.5 rounded-lg"
            >
              ⚙ Configurações
            </a>
          )}
          <button
            onClick={() => logout.mutate()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </header>
  )
}
