'use client'

import Link from 'next/link'
import { Menu, Globe, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

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
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        scrolled ? 'border-border/40 bg-background/80 py-3 backdrop-blur-md' : 'border-transparent bg-transparent py-5'
      )}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-4" aria-label="Primary navigation">
        <Link href="/" className="text-xl font-black tracking-tighter text-primary" onClick={closeMenu}>
          {brand}
        </Link>

        <div className="hidden items-center gap-8 md:flex">
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

        <div className="hidden items-center gap-4 md:flex">
          {showUtilityIcons && (
            <div className="mr-4 flex items-center gap-2 border-r border-border/40 pr-4">
              <ThemeToggle className="h-9 w-9 border-border/50 bg-surface/70 text-muted-foreground hover:text-surface-foreground" />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <Globe size={18} />
              </Button>
            </div>
          )}

          {actions.map((action) => (
            <Button
              key={`${action.href}-${action.label}`}
              asChild
              variant={action.variant === 'primary' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'font-semibold',
                action.variant === 'primary' ? 'rounded-full px-6' : 'text-muted-foreground'
              )}
            >
              <Link href={action.href} aria-current={action.current ? 'page' : undefined}>
                {action.label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="h-10 w-10 border-border/50 bg-surface/70 text-muted-foreground" />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </nav>

      <div
        className={cn(
          'fixed inset-0 top-[60px] z-40 flex flex-col gap-8 bg-background px-4 py-8 transition-all duration-300 ease-in-out md:hidden',
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
