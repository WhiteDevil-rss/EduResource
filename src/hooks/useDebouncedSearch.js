'use client'

import { useDebounce } from '@/hooks/useDebounce'

export function useDebouncedSearch(value, delayMs = 350) {
  return useDebounce(value, delayMs)
}
