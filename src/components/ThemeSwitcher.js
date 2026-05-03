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

export function ThemeSwitcher({ className = '' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/85 px-2 py-2 shadow-lg shadow-primary/10 backdrop-blur-xl',
        className
      )}
    >
      <ThemeToggle 
        className="h-10 w-10 rounded-full border border-border/50 bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/60" 
        showLabel={false} 
      />
    </div>
  )
}
