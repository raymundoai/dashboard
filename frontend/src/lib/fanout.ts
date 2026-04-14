import type { DataResponse, YearEntry, WeeklyEntry } from './types'

const BREW_SOURCES = ['brew', 'brewnh', 'brewpoa'] as const
const GROW_SOURCES = ['grow', 'grow_fisica'] as const
const BIGB_SOURCES = ['bigb'] as const
const ALL_SOURCES = [...BREW_SOURCES, ...GROW_SOURCES, ...BIGB_SOURCES] as const

export type Segment = 'brew' | 'grow' | 'bigb' | 'all'

export function sourcesForSegment(segment: Segment): readonly string[] {
  if (segment === 'brew') return BREW_SOURCES
  if (segment === 'grow') return GROW_SOURCES
  if (segment === 'bigb') return BIGB_SOURCES
  return ALL_SOURCES
}

/** Fetch /api/data for multiple sources in parallel and sum results. */
export async function fanoutData(
  sources: readonly string[],
  startYear: number,
  endYear: number,
): Promise<DataResponse> {
  const results = await Promise.allSettled(
    sources.map((s) =>
      fetch(`/api/data?source=${s}&startYear=${startYear}&endYear=${endYear}`, {
        credentials: 'include',
      }).then((r) => (r.ok ? r.json() : null)),
    ),
  )

  const valid = results
    .filter((r): r is PromiseFulfilledResult<DataResponse> => r.status === 'fulfilled' && r.value != null)
    .map((r) => r.value)

  if (valid.length === 0) throw new Error('All fan-out sources failed')

  // Use first result as base for structure, sum numeric arrays
  const base = valid[0]
  const merged: DataResponse = {
    ...base,
    years: mergeYears(valid.map((v) => v.years)),
    weekly: mergeWeekly(valid.map((v) => v.weekly)),
  }
  return merged
}

function mergeYears(allYears: YearEntry[][]): YearEntry[] {
  if (allYears.length === 0) return []
  const base = allYears[0]
  return base.map((entry, yi) => {
    const others = allYears.slice(1).map((y) => y[yi]).filter(Boolean)
    return {
      ...entry,
      realizado: entry.realizado.map((v, mi) =>
        sumNullable([v, ...others.map((o) => o.realizado[mi])]),
      ),
      orderCounts: entry.orderCounts.map((v, mi) =>
        sumNullableInt([v, ...others.map((o) => o.orderCounts[mi])]),
      ),
      orderTotal: sumNullableInt([entry.orderTotal, ...others.map((o) => o.orderTotal)]),
      realTotal: sumNullable([entry.realTotal, ...others.map((o) => o.realTotal)]),
      // meta stays from first source (brew/grow only have targets)
    }
  })
}

function mergeWeekly(allWeekly: WeeklyEntry[][]): WeeklyEntry[] {
  if (allWeekly.length === 0) return []
  const base = allWeekly[0]
  return base.map((entry) => {
    const others = allWeekly.slice(1)
    const matches = others.map((w) => w.find((e) => e.year === entry.year && e.month === entry.month && e.week === entry.week))
    return {
      ...entry,
      realizado: sumNullable([entry.realizado, ...matches.map((m) => m?.realizado ?? null)]),
    }
  })
}

function sumNullable(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number')
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null
}

function sumNullableInt(values: (number | null | undefined)[]): number | null {
  const result = sumNullable(values)
  return result !== null ? Math.round(result) : null
}
