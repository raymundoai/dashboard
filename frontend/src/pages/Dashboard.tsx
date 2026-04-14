import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

import { STORE_OPTIONS } from '@/lib/types'
import type { StoreKey, ViewMode } from '@/lib/types'

const AlertBar = lazy(() => import('@/components/shared/AlertBar'))
const S1_VisaoGeral = lazy(() => import('@/sections/S1_VisaoGeral'))
const S1_LojaEspecifica = lazy(() => import('@/sections/S1_LojaEspecifica'))
const S1_Anual = lazy(() => import('@/sections/S1_Anual'))
const S2_KpiCards = lazy(() => import('@/sections/S2_KpiCards'))
const S2_Anual = lazy(() => import('@/sections/S2_Anual'))
const S3_Formas = lazy(() => import('@/sections/S3_Formas'))
const S4_TopLists = lazy(() => import('@/sections/S4_TopLists'))
const S5_Funil = lazy(() => import('@/sections/S5_Funil'))

interface Props {
  store: StoreKey
  year: number
  month: number
  viewMode: ViewMode
}

export default function Dashboard({ store, year, month, viewMode }: Props) {
  const storeOpt = STORE_OPTIONS.find(option => option.key === store)
  const isAll = store === 'all'
  const isEcommerce = storeOpt?.isEcommerce ?? false
  const isMensal = viewMode === 'mensal'

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-8">
      <SectionSuspense fallback={<BannerSkeleton />}>
        <AlertBar />
      </SectionSuspense>

      {isMensal ? (
        <>
          <SectionSuspense fallback={<HeroSkeleton />}>
            {isAll
              ? <S1_VisaoGeral year={year} month={month} />
              : <S1_LojaEspecifica store={store} year={year} month={month} />}
          </SectionSuspense>

          {isAll && (
            <SectionSuspense fallback={<CardsSkeleton />}>
              <S2_KpiCards source={store} year={year} month={month} />
            </SectionSuspense>
          )}

          <DeferredSection fallback={<ChartGridSkeleton />}>
            <SectionSuspense fallback={<ChartGridSkeleton />}>
              <S3_Formas store={store} />
            </SectionSuspense>
          </DeferredSection>

          <DeferredSection fallback={<ListSkeleton />}>
            <SectionSuspense fallback={<ListSkeleton />}>
              <S4_TopLists store={store} year={year} month={month} viewMode={viewMode} />
            </SectionSuspense>
          </DeferredSection>

          {isEcommerce && (
            <DeferredSection fallback={<HeroSkeleton />}>
              <SectionSuspense fallback={<HeroSkeleton />}>
                <S5_Funil store={store} year={year} month={month} />
              </SectionSuspense>
            </DeferredSection>
          )}
        </>
      ) : (
        <>
          <SectionSuspense fallback={<HeroSkeleton />}>
            <S1_Anual store={store} year={year} />
          </SectionSuspense>

          <DeferredSection fallback={<HeroSkeleton />}>
            <SectionSuspense fallback={<HeroSkeleton />}>
              <S2_Anual store={store} year={year} />
            </SectionSuspense>
          </DeferredSection>

          <DeferredSection fallback={<ChartGridSkeleton />}>
            <SectionSuspense fallback={<ChartGridSkeleton />}>
              <S3_Formas store={store} />
            </SectionSuspense>
          </DeferredSection>

          <DeferredSection fallback={<ListSkeleton />}>
            <SectionSuspense fallback={<ListSkeleton />}>
              <S4_TopLists store={store} year={year} month={month} viewMode={viewMode} />
            </SectionSuspense>
          </DeferredSection>

          {isEcommerce && (
            <DeferredSection fallback={<HeroSkeleton />}>
              <SectionSuspense fallback={<HeroSkeleton />}>
                <S5_Funil store={store} year={year} month={month} />
              </SectionSuspense>
            </DeferredSection>
          )}
        </>
      )}
    </main>
  )
}

function SectionSuspense({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}

function DeferredSection({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return
    const element = containerRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [isVisible])

  return <div ref={containerRef}>{isVisible ? children : fallback}</div>
}

function BannerSkeleton() {
  return <div className="h-16 animate-pulse rounded-2xl border border-border/50 bg-card/50" />
}

function HeroSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="h-72 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
      <div className="h-72 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
    </section>
  )
}

function CardsSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
      ))}
    </section>
  )
}

function ChartGridSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="h-80 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
      <div className="h-80 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
    </section>
  )
}

function ListSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="h-96 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
      <div className="h-96 animate-pulse rounded-2xl border border-border/50 bg-card/40" />
    </section>
  )
}
