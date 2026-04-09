'use client'

import { useEffect, useState } from 'react'

export function useDebounce(value, delayMs = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
