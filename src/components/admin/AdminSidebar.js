'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'
import { cn } from '@/lib/cn'
import { resolveSidebarKeyboardAction } from '@/components/admin/sidebarKeyboard'

function SidebarContent({ sections, onNavigate, onLogout, role = 'admin' }) {
  const pathname = usePathname()
  const navRef = useRef(null)
  const [collapsedGroups, setCollapsedGroups] = useState({})

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const stored = window.localStorage.getItem('admin-sidebar-collapsed-groups')
    if (!stored) {
      return
    }
    try {
      setCollapsedGroups(JSON.parse(stored))
    } catch {
      setCollapsedGroups({})
    }
  }, [])

  const toggleGroup = (label) => {
    setCollapsedGroups((current) => {
      const next = { ...current, [label]: !current[label] }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin-sidebar-collapsed-groups', JSON.stringify(next))
      }
      return next
    })
  }

  const onNavKeyDown = (event) => {
    const interactiveSelector = '[data-sidebar-group-toggle="true"], [data-sidebar-group-link="true"]'
    const navNode = navRef.current
    if (!navNode) {
      return
    }

    const target = event.target
    if (!target || typeof target.matches !== 'function' || !target.matches(interactiveSelector)) {
      return
    }

    const items = Array.from(navNode.querySelectorAll(interactiveSelector)).filter(
      (node) => node && typeof node.focus === 'function' && node.offsetParent !== null
    )
    if (items.length === 0) {
      return
    }

    const currentIndex = items.findIndex((node) => node === target)
    if (currentIndex === -1) {
      return
    }

    const groupLabel = target.getAttribute('data-group-label')
    const action = resolveSidebarKeyboardAction({
      key: event.key,
      currentIndex,
      totalItems: items.length,
      isGroupToggle: target.hasAttribute('data-sidebar-group-toggle'),
      groupLabel,
      isGroupCollapsed: Boolean(groupLabel ? collapsedGroups[groupLabel] : false),
    })

    if (action.type === 'focus-index') {
      event.preventDefault()
      items[action.index]?.focus()
      return
    }

    if (action.type === 'toggle-group' && action.groupLabel) {
      event.preventDefault()
      toggleGroup(action.groupLabel)
      return
    }

    if (action.type === 'focus-first-group-link') {
      const firstLink = target
        .closest('[data-sidebar-group]')
        ?.querySelector('[data-sidebar-group-link="true"]')

      if (firstLink && typeof firstLink.focus === 'function') {
        event.preventDefault()
        firstLink.focus()
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/95">
      <div className="border-b border-border px-4 py-5 md:px-6">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
          <RoleAvatar role={role} label="super admin workspace" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Super Admin</p>
            <p className="truncate text-xs text-muted-foreground">Operations Console</p>
          </div>
        </div>
      </div>

      <nav
        ref={navRef}
        className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-3 py-4 md:px-4"
        aria-label="Super admin navigation"
        onKeyDown={onNavKeyDown}
      >
        <div className="space-y-4">
          {sections.map((section) => (
          <div className="space-y-2" key={section.label} data-sidebar-group>
            <button
              type="button"
              data-sidebar-group-toggle="true"
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              data-group-label={section.label}
              onClick={() => toggleGroup(section.label)}
              aria-expanded={!collapsedGroups[section.label]}
              aria-controls={`admin-group-${section.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
              <ChevronDown
                size={14}
                className={cn('transition-transform', collapsedGroups[section.label] && 'rotate-180')}
              />
            </button>
            <div
              id={`admin-group-${section.label.replace(/\s+/g, '-').toLowerCase()}`}
              className={cn('space-y-1', collapsedGroups[section.label] && 'hidden')}
            >
              {section.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    data-sidebar-group-link="true"
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                    title={item.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-border px-3 py-4 md:px-4">
        <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-xl" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function AdminSidebar({ sections, mobileOpen, onMobileOpenChange, onLogout }) {
  return (
    <>
      <aside className="hidden md:flex md:h-dvh md:w-80 md:flex-none md:flex-col md:border-r md:border-border md:bg-background md:shadow-sm">
        <SidebarContent sections={sections} onNavigate={() => {}} onLogout={onLogout} />
      </aside>

      <Dialog
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
        className="md:hidden"
        labelledBy="super-admin-mobile-nav-title"
      >
        <h2 id="super-admin-mobile-nav-title" className="sr-only">
          Super admin navigation
        </h2>
        <aside className="flex h-[100dvh] w-[88vw] max-w-sm flex-col overflow-hidden border-r border-border bg-background shadow-2xl md:hidden">
          <SidebarContent
            sections={sections}
            onNavigate={() => onMobileOpenChange(false)}
            onLogout={onLogout}
          />
        </aside>
      </Dialog>
    </>
  )
}
