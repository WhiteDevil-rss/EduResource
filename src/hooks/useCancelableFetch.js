'use client'

import { useCallback, useEffect, useRef } from 'react'

export function isAbortError(error) {
  return error?.name === 'AbortError'
}

export function useCancelableFetch() {
  const controllerRef = useRef(null)

  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
  }, [])

  const execute = useCallback(
    async (input, init = {}) => {
      cancel()
      const controller = new globalThis.AbortController()
      controllerRef.current = controller

      try {
        return await fetch(input, {
          ...init,
          signal: controller.signal,
        })
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    [cancel]
  )

  useEffect(() => () => cancel(), [cancel])

  return { execute, cancel }
}
