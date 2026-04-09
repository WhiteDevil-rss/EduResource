'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccentSelector } from '@/components/AccentSelector'
import { AppIcon } from '@/components/ui/AppIcon'

export default function PublicHeader({
  brand = 'SPS EDUCATIONAM',
  links = [],
  actions = [],
  showUtilityIcons = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full max-w-full overflow-x-clip border-b transition-all duration-300',
        scrolled ? 'border-border/40 bg-background/80 py-3 backdrop-blur-md' : 'border-transparent bg-transparent py-5'
      )}
    >
      <nav className="mx-auto flex w-full max-w-[1400px] min-w-0 items-center justify-between gap-3 px-4" aria-label="Primary navigation">
        <Link href="/" className="shrink min-w-0 max-w-[calc(100%-7rem)] truncate text-lg font-black tracking-tight text-primary sm:text-xl lg:max-w-[240px] xl:max-w-none" onClick={closeMenu}>
          {brand}
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-5 lg:flex">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              aria-current={link.current ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 min-w-0 flex-wrap items-center justify-end gap-2 lg:gap-3 md:flex">
          <div className="flex items-center justify-end gap-3 flex-wrap">
            {actions.map((action) => (
              <Button
                key={`${action.href}-${action.label}`}
                asChild
                variant={action.variant === 'primary' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'font-semibold',
                  action.variant === 'primary' ? 'rounded-full px-6' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Link href={action.href} aria-current={action.current ? 'page' : undefined}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <AppIcon icon={X} size={24} interactive /> : <AppIcon icon={Menu} size={24} interactive />}
          </Button>
        </div>
      </nav>

      {showUtilityIcons ? (
        <div className="fixed right-4 top-20 z-50 md:right-6 md:top-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/85 px-2 py-2 shadow-lg shadow-primary/10 backdrop-blur-xl">
            <ThemeToggle />
            <div className="hidden h-8 w-px bg-border/50 sm:block" aria-hidden="true" />
            <AccentSelector />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'fixed inset-y-0 left-0 right-0 top-[60px] z-40 w-full max-w-full overflow-x-hidden flex flex-col gap-8 bg-background px-4 py-8 transition-all duration-300 ease-in-out md:hidden',
          menuOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-full opacity-0'
        )}
      >
        <div className="flex flex-col gap-6">
          {links.map((link) => (
            <Link
              key={`mobile-${link.href}-${link.label}`}
              href={link.href}
              className="text-2xl font-bold tracking-tight transition-colors hover:text-primary"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-4 border-t border-border/40 pt-8">
          {actions.map((action) => (
            <Button
              key={`mobile-action-${action.href}-${action.label}`}
              asChild
              variant={action.variant === 'primary' ? 'default' : 'secondary'}
              size="lg"
              className="h-14 w-full rounded-2xl text-lg"
              onClick={closeMenu}
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </header>
  )
}
