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
    const interactiveSelector = '.admin-v2-sidebar__group-toggle, .admin-v2-sidebar__group-links a'
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
      isGroupToggle: target.classList.contains('admin-v2-sidebar__group-toggle'),
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
        .closest('.admin-v2-sidebar__group')
        ?.querySelector('.admin-v2-sidebar__group-links a')

      if (firstLink && typeof firstLink.focus === 'function') {
        event.preventDefault()
        firstLink.focus()
      }
    }
  }

  return (
    <div className="admin-v2-sidebar__inner">
      <div className="admin-v2-sidebar__header">
        <div className="student-sidebar__brand">
          <RoleAvatar role={role} label="super admin workspace" />
          <div>
            <p className="student-sidebar__title">Super Admin</p>
            <p className="student-sidebar__subtitle">Operations Console</p>
          </div>
        </div>
      </div>

      <nav
        ref={navRef}
        className="admin-v2-sidebar__nav custom-scrollbar"
        aria-label="Super admin navigation"
        onKeyDown={onNavKeyDown}
      >
        {sections.map((section) => (
          <div className="admin-v2-sidebar__group" key={section.label}>
            <button
              type="button"
              className="admin-v2-sidebar__group-toggle"
              data-group-label={section.label}
              onClick={() => toggleGroup(section.label)}
              aria-expanded={!collapsedGroups[section.label]}
              aria-controls={`admin-group-${section.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <p className="admin-v2-sidebar__group-label">{section.label}</p>
              <ChevronDown size={14} className={cn('admin-v2-sidebar__chevron', collapsedGroups[section.label] && 'admin-v2-sidebar__chevron--collapsed')} />
            </button>
            <div
              id={`admin-group-${section.label.replace(/\s+/g, '-').toLowerCase()}`}
              className={cn('admin-v2-sidebar__group-links', collapsedGroups[section.label] && 'admin-v2-sidebar__group-links--collapsed')}
            >
              {section.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn('student-sidebar__link', active && 'student-sidebar__link--active')}
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
      </nav>

      <div className="admin-v2-sidebar__footer">
        <Button type="button" variant="outline" className="student-sidebar__logout" onClick={onLogout}>
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
      <aside className="admin-v2-sidebar admin-v2-sidebar--desktop">
        <SidebarContent sections={sections} onNavigate={() => {}} onLogout={onLogout} />
      </aside>

      <Dialog
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
        className="student-mobile-nav"
        labelledBy="super-admin-mobile-nav-title"
      >
        <h2 id="super-admin-mobile-nav-title" className="sr-only">
          Super admin navigation
        </h2>
        <aside className="admin-v2-sidebar admin-v2-sidebar--mobile">
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
