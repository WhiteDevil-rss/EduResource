'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import {
  ACCENT_EVENT,
  ACCENT_STORAGE_KEY,
  applyTheme,
  persistAccent,
  readStoredTheme,
  resolveAccent,
} from '@/lib/theme'

const ACCENTS = [
  { value: 'indigo', label: 'Blue', color: '#4f46e5' },
  { value: 'teal', label: 'Teal', color: '#0f766e' },
  { value: 'violet', label: 'Violet', color: '#7c3aed' },
]

export function AccentSelector({ className = '' }) {
  const [accent, setAccent] = useState('indigo')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const syncAccent = (incomingAccent) => {
      const nextAccent = resolveAccent(incomingAccent ?? window.localStorage.getItem(ACCENT_STORAGE_KEY))
      setAccent(nextAccent)
      applyTheme(readStoredTheme(), nextAccent)
    }

    syncAccent()
    setMounted(true)

    const handleStorage = (event) => {
      if (!event.key || event.key === ACCENT_STORAGE_KEY) {
        syncAccent(event.newValue)
      }
    }

    const handleCustomAccentChange = (event) => {
      syncAccent(event.detail)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(ACCENT_EVENT, handleCustomAccentChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(ACCENT_EVENT, handleCustomAccentChange)
    }
  }, [])

  const handleAccentChange = (newAccent) => {
    const resolved = resolveAccent(newAccent)
    setAccent(resolved)
    persistAccent(resolved)
    applyTheme(readStoredTheme(), resolved)
  }

  if (!mounted) {
    return null
  }

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="group"
      aria-label="Accent color selector"
    >
      {ACCENTS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleAccentChange(opt.value)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
            accent === opt.value
              ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
              : 'border-border/40 bg-background hover:bg-muted/70 hover:border-primary/30'
          )}
          aria-label={`Set accent to ${opt.label}`}
          aria-pressed={accent === opt.value}
          title={`${opt.label} accent`}
        >
          <span
            className={cn(
              'h-3.5 w-3.5 rounded-full ring-2 ring-offset-2 ring-offset-background',
              opt.value === 'indigo' ? 'bg-blue-500' : opt.value === 'teal' ? 'bg-teal-500' : 'bg-violet-500'
            )}
          />
        </button>
      ))}
    </div>
  )
}
