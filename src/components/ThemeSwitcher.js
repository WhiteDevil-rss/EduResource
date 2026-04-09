"use client";

import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/cn'

const ACCENT_STORAGE_KEY = 'eduresourcehub-accent'
const ACCENTS = [
  { id: 'blue', label: 'Blue', tone: 'bg-blue-500' },
  { id: 'teal', label: 'Teal', tone: 'bg-teal-500' },
  { id: 'violet', label: 'Violet', tone: 'bg-violet-500' },
]

function applyAccent(accent) {
  if (typeof document === 'undefined') {
    return
  }

  const normalized = ACCENTS.some((entry) => entry.id === accent) ? accent : 'blue'
  document.documentElement.setAttribute('data-accent', normalized)
  window.localStorage.setItem(ACCENT_STORAGE_KEY, normalized)
}

export function ThemeSwitcher({ className = '', compact = false }) {
  const [accent, setAccent] = useState('blue')

  useEffect(() => {
    const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    const nextAccent = ACCENTS.some((entry) => entry.id === savedAccent) ? savedAccent : 'blue'
    setAccent(nextAccent)
    applyAccent(nextAccent)
  }, [])

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/85 px-2 py-2 shadow-lg shadow-primary/10 backdrop-blur-xl',
        className
      )}
    >
      <ThemeToggle className="button button theme-toggle gap-2 rounded-full border border-border/50 bg-background/80 px-3 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/60 hover:text-foreground h-10 w-10 rounded-full border-border/50 bg-background/90 text-foreground hover:bg-muted/70 h-11 w-11 rounded-xl border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground" showLabel={!compact} />

      <div className="hidden h-8 w-px bg-border/50 sm:block" aria-hidden="true" />

      <div className="flex items-center gap-1">
        {!compact && (
          <span className="hidden items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground sm:inline-flex">
            <Palette className="h-3.5 w-3.5" />
            Accent
          </span>
        )}
        {ACCENTS.map((entry) => {
          const selected = accent === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setAccent(entry.id)
                applyAccent(entry.id)
              }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                selected
                  ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                  : 'border-border/40 bg-background hover:bg-muted/70 hover:border-primary/30'
              )}
              aria-label={`Set accent to ${entry.label}`}
              aria-pressed={selected}
              title={`${entry.label} accent`}
            >
              <span className={cn('h-3.5 w-3.5 rounded-full ring-2 ring-offset-2 ring-offset-background', entry.tone)} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
