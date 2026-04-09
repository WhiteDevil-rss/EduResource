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
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 p-1.5 backdrop-blur-sm',
        className
      )}
      role="group"
      aria-label="Accent color selector"
    >
      {ACCENTS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleAccentChange(opt.value)}
          className={cn(
            'h-6 w-6 rounded-md transition-all',
            accent === opt.value
              ? 'ring-2 ring-offset-1 ring-offset-background/50 shadow-md'
              : 'opacity-60 hover:opacity-100'
          )}
          style={{
            backgroundColor: opt.color,
          }}
          title={`Switch to ${opt.label} accent`}
          aria-label={`${opt.label} accent`}
          aria-current={accent === opt.value ? 'true' : 'false'}
        />
      ))}
    </div>
  )
}
