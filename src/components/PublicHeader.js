'use client'

import Link from 'next/link'
import { Menu, X, ShieldCheck, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function PublicHeader({
  brand = 'SPS EDUCATIONAM',
  links = [],
  actions = [],
  showUtilityIcons = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')

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
    } else {
      document.body.style.overflow = previousOverflow
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  useEffect(() => {
    // Only track sections if we have links that point to anchors
    const sectionLinks = links.filter(l => l.href.includes('#'))
    if (sectionLinks.length === 0) return

    const observers = []
    
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Trigger when section is in top-middle of viewport
      threshold: 0
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    sectionLinks.forEach(link => {
      const id = link.href.split('#')[1]
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [links])

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-500',
        scrolled
          ? 'border-b border-border/40 bg-background/60 py-3 backdrop-blur-xl shadow-[0_2px_20px_-10px_rgba(0,0,0,0.1)]'
          : 'bg-transparent py-6'
      )}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-transform duration-300 active:scale-95"
            onClick={closeMenu}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110">
              <ShieldCheck className="text-primary-foreground" size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">SPS</span>
              <span className="hidden sm:inline"> EDUCATIONAM</span>
            </span>
          </Link>
        </div>

        <div className="hidden lg:flex lg:gap-x-1">
          {links.map((link) => {
            const isSectionLink = link.href.includes('#')
            const sectionId = isSectionLink ? link.href.split('#')[1] : null
            const isActive = isSectionLink 
              ? activeSection === sectionId 
              : link.current

            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={cn(
                  "relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-x-4 -bottom-px h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-in fade-in slide-in-from-bottom-1 duration-500" />
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 lg:gap-4">
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            {showUtilityIcons && (
              <div className="h-9 w-[1px] bg-border/40" />
            )}
            {showUtilityIcons && <ThemeToggle />}

            {actions.map((action) => (
              <Button
                key={`${action.href}-${action.label}`}
                asChild
                variant={action.variant === 'primary' ? 'default' : 'ghost'}
                className={cn(
                  'rounded-full px-8 h-11 font-bold shadow-md transition-all duration-300',
                  action.variant === 'primary'
                    ? 'bg-primary text-primary-foreground hover:shadow-primary/30 hover:scale-105 active:scale-95'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Link href={action.href}>
                  {action.label}
                  {action.variant === 'primary' && <ChevronRight className="ml-1.5 h-4 w-4" />}
                </Link>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative z-50 h-11 w-11 rounded-full hover:bg-muted transition-transform active:scale-90"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={28} /> : <Menu size={28} />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 flex flex-col bg-background/98 backdrop-blur-2xl transition-all duration-500 lg:hidden',
          menuOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible pointer-events-none'
        )}
      >
        <div className="flex h-full flex-col px-8 py-24 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {links.map((link, i) => {
              const isSectionLink = link.href.includes('#')
              const sectionId = isSectionLink ? link.href.split('#')[1] : null
              const isActive = isSectionLink 
                ? activeSection === sectionId 
                : link.current

              return (
                <Link
                  key={`mobile-${link.href}-${link.label}`}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl p-4 text-2xl font-bold tracking-tight transition-all active:scale-95",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground active:bg-muted"
                  )}
                  onClick={closeMenu}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  {link.label}
                  <ChevronRight className={cn(isActive ? "text-primary" : "text-primary/40")} size={24} />
                </Link>
              )
            })}
          </div>

          <div className="mt-auto space-y-4 pt-12">
            {actions.map((action) => (
              <Button
                key={`mobile-action-${action.href}-${action.label}`}
                asChild
                variant={action.variant === 'primary' ? 'default' : 'outline'}
                size="lg"
                className="h-16 w-full rounded-2xl text-xl font-bold"
                onClick={closeMenu}
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
