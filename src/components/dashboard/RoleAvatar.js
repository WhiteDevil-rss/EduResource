/* global MutationObserver */
'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Shield, UserRoundCog } from 'lucide-react'
import { cn } from '@/lib/cn'

const ROLE_ICON = {
  student: GraduationCap,
  faculty: UserRoundCog,
  admin: Shield,
}

// Theme-aware styles: dark mode and light mode variants
const ROLE_STYLES_DARK = {
  student: 'bg-sky-500/12 text-sky-400 ring-sky-500/20',
  faculty: 'bg-amber-500/12 text-amber-400 ring-amber-500/20',
  admin: 'bg-emerald-500/12 text-emerald-400 ring-emerald-500/20',
}

const ROLE_STYLES_LIGHT = {
  student: 'bg-sky-100 text-sky-700 ring-sky-200',
  faculty: 'bg-amber-100 text-amber-700 ring-amber-200',
  admin: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
}

export function RoleAvatar({ role = 'student', label, size = 'md', className = '' }) {
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkTheme(isDark)
    setMounted(true)

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkTheme(isDark)
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const normalizedRole = ROLE_ICON[role] ? role : 'student'
  const Icon = ROLE_ICON[normalizedRole]
  const isSmall = size === 'sm'
  const ROLE_STYLES = isDarkTheme ? ROLE_STYLES_DARK : ROLE_STYLES_LIGHT

  if (!mounted) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl ring-1',
        isSmall ? 'h-8 w-8' : 'h-10 w-10',
        ROLE_STYLES[normalizedRole],
        className
      )}
      role="img"
      aria-label={label || `${normalizedRole} profile`}
    >
      <Icon size={isSmall ? 14 : 18} className="shrink-0" />
    </span>
  )
}
