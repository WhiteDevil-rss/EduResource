'use client'

import { useEffect, useState } from 'react'
import { MoonStar, SunMedium } from 'lucide-react'
import { Button } from './ui/button'
import {
  THEME_EVENT,
  applyTheme,
  persistTheme,
  readStoredAccent,
  readStoredTheme,
  resolveTheme,
} from '@/lib/theme'
import { cn } from '@/lib/cn'

export function ThemeToggle({ className = '', showLabel = false }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const syncTheme = (incomingTheme) => {
      const nextTheme = resolveTheme(incomingTheme ?? readStoredTheme())
      setTheme(nextTheme)
      applyTheme(nextTheme, readStoredAccent())
      setMounted(true)
    }

    syncTheme()

    const handleStorage = (event) => {
      if (!event.key || event.key === 'eduresourcehub-theme') {
        syncTheme(event.newValue)
      }
    }

    const handleCustomChange = (event) => {
      syncTheme(event.detail)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_EVENT, handleCustomChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_EVENT, handleCustomChange)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    persistTheme(nextTheme)
    applyTheme(nextTheme, readStoredAccent())
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={toggleTheme}
      className={cn(
        showLabel
          ? 'h-11 rounded-full px-4'
          : 'size-11 rounded-xl px-0',
        'border border-border/70 bg-card/85 text-muted-foreground hover:text-foreground',
        className
      )}
      aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Toggle theme'}
      title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Toggle theme'}
    >
      {theme === 'dark' ? (
        <SunMedium size={16} aria-hidden="true" />
      ) : (
        <MoonStar size={16} aria-hidden="true" />
      )}
      {showLabel ? <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span> : null}
    </Button>
  )
}
