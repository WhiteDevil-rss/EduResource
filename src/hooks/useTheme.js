'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'eduresourcehub-theme'

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY)
    const nextTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : getSystemTheme()

    setTheme(nextTheme)
    setMounted(true)

    // Listen for storage changes
    const handleStorageChange = () => {
      const updatedTheme = window.localStorage.getItem(STORAGE_KEY)
      if (updatedTheme === 'light' || updatedTheme === 'dark') {
        setTheme(updatedTheme)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return { theme, mounted }
}
