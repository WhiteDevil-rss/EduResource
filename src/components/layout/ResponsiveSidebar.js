'use client'

import Link from 'next/link'
import { LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/components/ui/AppIcon'
import { cn } from '@/lib/cn'
import { filterNavItemsByRole } from '@/lib/feature-access'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'

/**
 * SidebarContent - Logic and rendering for navigation links
 */
function SidebarContent({ user, role, title, subtitle, navItems, navSections, onLogout }) {
  const filteredSections = Array.isArray(navSections)
    ? navSections
      .map((section) => ({
        ...section,
        items: filterNavItemsByRole(user || { role }, section.items || []),
      }))
      .filter((section) => section.items.length > 0)
    : []

  const visibleNavItems = filteredSections.length > 0
    ? []
    : filterNavItemsByRole(user || { role }, navItems)

  return (
    <div className="panel-shell flex h-full min-w-0 flex-col overflow-x-hidden bg-card/80 backdrop-blur-xl">
      <div className="border-b border-border/60 px-6 py-6">
        <div className="flex items-center gap-3">
          <RoleAvatar role={role} className="h-11 w-11 shadow-sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-hide" aria-label="Main Navigation">
        {filteredSections.length > 0 ? (
          <div className="space-y-5">
            {filteredSections.map((section) => (
              <section key={section.label || 'section'}>
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {section.label || 'Workspace'}
                </div>
                <ul className="space-y-1" role="list">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = item.active || false

                    return (
                      <li key={item.id || item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                              : 'text-muted-foreground hover:bg-muted/65 hover:text-foreground active:scale-[0.98]'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <AppIcon
                            icon={Icon}
                            size={18}
                            active={isActive}
                            interactive={!isActive}
                            className={cn('shrink-0 transition-transform duration-200 group-hover:scale-110', !isActive && 'group-hover:text-foreground')}
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
              </section>
            ))}
          </div>
        ) : (
          <>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Workspace
            </div>
            <ul className="space-y-1" role="list">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const isActive = item.active || false

                return (
                  <li key={item.id || item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:bg-muted/65 hover:text-foreground active:scale-[0.98]'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <AppIcon
                        icon={Icon}
                        size={18}
                        active={isActive}
                        interactive={!isActive}
                        className={cn('shrink-0 transition-transform duration-200 group-hover:scale-110', !isActive && 'group-hover:text-foreground')}
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
          </>
        )}
      </nav>

      <div className="border-t border-border/60 p-4">
        <Button
          variant="ghost"
          className="h-11 w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-danger/10 hover:text-danger active:scale-[0.98] transition-all"
          onClick={onLogout}
        >
          <AppIcon icon={LogOut} size={18} interactive className="shrink-0" />
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
  navSections,
  navItems,
  mobileOpen,
  onMobileOpenChange,
  onLogout,
}) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] transition-all duration-300 md:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onMobileOpenChange(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[70] w-full max-w-[320px] overflow-x-hidden bg-background shadow-2xl transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => onMobileOpenChange(false)}
          className="absolute right-4 top-4 z-[80] flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-label="Close sidebar"
        >
          <AppIcon icon={X} size={20} interactive />
        </button>

        <SidebarContent
          user={user}
          role={role}
          title={title}
          subtitle={subtitle}
          navSections={navSections}
          navItems={navItems}
          onLogout={onLogout}
        />
      </aside>

      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-72 md:flex-col md:border-r md:border-border/60 md:bg-transparent">
        <SidebarContent
          user={user}
          role={role}
          title={title}
          subtitle={subtitle}
          navSections={navSections}
          navItems={navItems}
          onLogout={onLogout}
        />
      </aside>

      <div className="hidden md:block md:w-72 md:flex-none" />
    </>
  )
}
