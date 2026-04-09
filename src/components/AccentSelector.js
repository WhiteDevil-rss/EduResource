'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

const ACCENTS = [
  { value: 'indigo', label: 'Blue', color: '#4f46e5' },
  { value: 'teal', label: 'Teal', color: '#0f766e' },
  { value: 'violet', label: 'Violet', color: '#7c3aed' },
]

const STORAGE_KEY = 'eduresourcehub-accent'

function applyAccent(accent) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-accent', accent)
}

export function AccentSelector({ className = '' }) {
  const [accent, setAccent] = useState('indigo')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedAccent = window.localStorage.getItem(STORAGE_KEY)
    const nextAccent = ['indigo', 'teal', 'violet'].includes(savedAccent) ? savedAccent : 'indigo'

    setAccent(nextAccent)
    applyAccent(nextAccent)
    setMounted(true)
  }, [])

  const handleAccentChange = (newAccent) => {
    setAccent(newAccent)
    window.localStorage.setItem(STORAGE_KEY, newAccent)
    applyAccent(newAccent)
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
