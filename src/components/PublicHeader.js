'use client'

import Link from 'next/link'
import { Menu, Moon, Globe, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

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
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled ? "bg-background/80 backdrop-blur-md border-border/40 py-3" : "bg-transparent border-transparent py-5"
      )}
    >
      <nav className="max-w-[1400px] mx-auto px-4 flex items-center justify-between" aria-label="Primary navigation">
        <Link href="/" className="text-xl font-black tracking-tighter text-primary" onClick={closeMenu}>
          {brand}
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
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

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {showUtilityIcons && (
            <div className="flex items-center gap-2 mr-4 border-r border-border/40 pr-4">
              <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground">
                <Moon size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground">
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
                "font-semibold",
                action.variant === 'primary' ? "rounded-full px-6" : "text-muted-foreground"
              )}
            >
              <Link href={action.href} aria-current={action.current ? 'page' : undefined}>
                {action.label}
              </Link>
            </Button>
          ))}
        </div>

        {/* Mobile Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </nav>

      {/* Mobile Menu */}
      <div className={cn(
        "fixed inset-0 top-[60px] z-40 bg-background md:hidden transition-all duration-300 ease-in-out px-4 py-8 flex flex-col gap-8",
        menuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
      )}>
        <div className="flex flex-col gap-6">
          {links.map((link) => (
            <Link
              key={`mobile-${link.href}-${link.label}`}
              href={link.href}
              className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-4 pt-8 border-t border-border/40">
          {actions.map((action) => (
            <Button
              key={`mobile-action-${action.href}-${action.label}`}
              asChild
              variant={action.variant === 'primary' ? 'default' : 'secondary'}
              size="lg"
              className="w-full text-lg h-14 rounded-2xl"
              onClick={closeMenu}
            >
              <Link href={action.href}>
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </header>
  )
}
