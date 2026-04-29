import { lazy, Suspense, useEffect, useState, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Shell from '@/components/layout/Shell'
import GlobalHeader from '@/components/layout/GlobalHeader'
import Login from '@/pages/Login'
import type { StoreKey, ThemeMode, ViewMode } from '@/lib/types'
import { api } from '@/lib/api'
import { coerceYearForStore } from '@/lib/yearRange'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))

interface MeResponse {
  username: string
  role: 'admin' | 'viewer'
}

export type SyncState = 'idle' | 'running' | 'done' | 'error'
const MANUAL_SYNC_LOOKBACK_DAYS = 60
const THEME_STORAGE_KEY = 'dashboard-theme'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

function useSyncManager() {
  const queryClient = useQueryClient()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  async function triggerSync() {
    if (syncState === 'running') return
    setSyncState('running')
    setSyncError(null)
    try {
      const { job_id } = await api.post<{ job_id: string }>(
        `/sync?source=all&mode=incremental&lookback_days=${MANUAL_SYNC_LOOKBACK_DAYS}`
      )
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get<{ status: string; error?: string }>(
            `/sync/status?job_id=${job_id}`
          )
          if (res.status === 'done') {
            stopPolling()
            setSyncState('done')
            queryClient.invalidateQueries()
            setTimeout(() => setSyncState('idle'), 3000)
          } else if (res.status === 'error') {
            stopPolling()
            setSyncState('error')
            setSyncError(res.error ?? 'Erro desconhecido')
            setTimeout(() => setSyncState('idle'), 5000)
          }
        } catch {
          stopPolling()
          setSyncState('error')
          setSyncError('Falha ao verificar status')
          setTimeout(() => setSyncState('idle'), 5000)
        }
      }, 2000)
    } catch {
      setSyncState('error')
      setSyncError('Falha ao iniciar sincronização')
      setTimeout(() => setSyncState('idle'), 5000)
    }
  }

  return { syncState, syncError, triggerSync }
}

export default function App() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [store, setStore] = useState<StoreKey>('all')
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [viewMode, setViewMode] = useState<ViewMode>('mensal')
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const { data: me, isLoading, isError, error } = useQuery<MeResponse>({
    queryKey: ['auth-me'],
    queryFn: () => api.get<MeResponse>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const { syncState, syncError, triggerSync } = useSyncManager()

  function handleStoreChange(nextStore: StoreKey) {
    setStore(nextStore)
    setYear(prevYear => coerceYearForStore(nextStore, prevYear, currentYear))
  }

  if (isLoading) return null

  // Only redirect to login on 401. Other errors show a generic message.
  if (isError) {
    const is401 = (error as Error)?.message === 'Unauthenticated'
    if (is401) return <Login theme={theme} onThemeChange={setTheme} />
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Erro ao carregar. Recarregue a página.
      </div>
    )
  }

  if (!me) return <Login theme={theme} onThemeChange={setTheme} />

  return (
    <Shell>
      <GlobalHeader
        store={store} year={year} month={month} viewMode={viewMode} role={me.role}
        theme={theme}
        syncState={syncState} syncError={syncError} onSyncClick={triggerSync}
        onStoreChange={handleStoreChange} onYearChange={setYear}
        onMonthChange={setMonth} onViewModeChange={setViewMode}
        onThemeChange={setTheme}
      />
      <Suspense fallback={<RouteSkeleton />}>
        <Routes>
          <Route path="/" element={
            <Dashboard store={store} year={year} month={month} viewMode={viewMode} />
          } />
          <Route path="/admin" element={
            me.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}

function RouteSkeleton() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="h-16 animate-pulse rounded-2xl border border-border/65 bg-card/50" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-border/65 bg-card/40" />
        <div className="h-64 animate-pulse rounded-2xl border border-border/65 bg-card/40" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-56 animate-pulse rounded-2xl border border-border/65 bg-card/40" />
        <div className="h-56 animate-pulse rounded-2xl border border-border/65 bg-card/40" />
        <div className="h-56 animate-pulse rounded-2xl border border-border/65 bg-card/40" />
      </div>
    </main>
  )
}
