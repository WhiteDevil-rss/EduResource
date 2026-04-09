'use client'

import Link from 'next/link'
import { LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { filterNavItemsByRole } from '@/lib/feature-access'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'

/**
 * SidebarContent - Logic and rendering for navigation links
 */
function SidebarContent({ user, role, title, subtitle, navItems, onLogout }) {
  const visibleNavItems = filterNavItemsByRole(user || { role }, navItems)

  return (
    <div className="flex h-full flex-col bg-background/95 backdrop-blur-sm lg:bg-background lg:backdrop-blur-none">
      {/* Sidebar Header */}
      <div className="border-b border-border/40 px-6 py-6">
        <div className="flex items-center gap-3">
          <RoleAvatar role={role} className="h-10 w-10 shadow-sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            <p className="truncate text-[10px] font-medium text-muted-strong uppercase tracking-wider">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide" aria-label="Main Navigation">
        <ul className="space-y-1" role="list">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.active || false

            return (
              <li key={item.id || item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-[0.98]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon 
                    size={18} 
                    className={cn(
                      'shrink-0 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'text-primary' : 'text-muted-foreground/60'
                    )} 
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span 
                      className="ml-auto h-1 w-1 rounded-full bg-primary animate-in fade-in zoom-in duration-300" 
                      aria-hidden="true" 
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-border/40 p-4">
        <Button
          variant="ghost"
          className="h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive active:scale-[0.98] transition-all"
          onClick={onLogout}
        >
          <LogOut size={18} className="shrink-0" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  )
}

/**
 * ResponsiveSidebar - The architected Sidebar system
 * Handles both mobile drawer state and desktop persistent view.
 */
export function ResponsiveSidebar({
  user,
  role,
  title,
  subtitle,
  navItems,
  mobileOpen,
  onMobileOpenChange,
  onLogout,
}) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] transition-all duration-300 md:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onMobileOpenChange(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[70] w-full max-w-[300px] bg-background shadow-2xl transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => onMobileOpenChange(false)}
          className="absolute right-4 top-4 z-[80] flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>

        <SidebarContent
          user={user}
          role={role}
          title={title}
          subtitle={subtitle}
          navItems={navItems}
          onLogout={onLogout}
        />
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-72 md:flex-col md:border-r md:border-border/50 md:bg-background">
        <SidebarContent
          user={user}
          role={role}
          title={title}
          subtitle={subtitle}
          navItems={navItems}
          onLogout={onLogout}
        />
      </aside>

      {/* Desktop Sidebar Spacer */}
      <div className="hidden md:block md:w-72 md:flex-none" />
    </>
  )
}
