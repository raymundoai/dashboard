import type { StoreKey } from '@/lib/types'

export const DEFAULT_MIN_YEAR = 2024
export const BREW_HISTORY_MIN_YEAR = 2021

export function getMinYearForStore(store: StoreKey): number {
  return store === 'brew' ? BREW_HISTORY_MIN_YEAR : DEFAULT_MIN_YEAR
}

export function getAvailableYears(store: StoreKey, currentYear: number): number[] {
  const minYear = getMinYearForStore(store)
  return Array.from({ length: currentYear - minYear + 1 }, (_, index) => minYear + index)
}

export function coerceYearForStore(store: StoreKey, year: number, currentYear: number): number {
  const minYear = getMinYearForStore(store)
  if (year < minYear) return minYear
  if (year > currentYear) return currentYear
  return year
}
