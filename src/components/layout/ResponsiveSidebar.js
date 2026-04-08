'use client'

import { LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { filterNavItemsByRole } from '@/lib/feature-access'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'

/**
 * SidebarContent - Shared sidebar navigation content
 */
function SidebarContent({ role, title, subtitle, navItems, onLogout }) {
  const visibleNavItems = filterNavItemsByRole({ role }, navItems)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-background/95 py-5">
      <div className="px-4 md:px-6">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
          <RoleAvatar role={role} label={`${role} workspace`} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-3 md:px-4" aria-label={`${role} navigation`}>
        <div className="space-y-2 pb-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.active || false

            return (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-border px-3 pt-4 md:px-4">
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-full justify-start rounded-xl text-sm"
          onClick={onLogout}
        >
          <LogOut size={16} className="flex-shrink-0" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

/**
 * ResponsiveSidebar - Mobile drawer + desktop fixed sidebar
 * Mobile: Hidden by default, slides in from left when open
 * Desktop: Fixed left sidebar
 */
export function ResponsiveSidebar({
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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          onClick={() => onMobileOpenChange(false)}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[86vw] max-w-sm border-r border-border bg-background shadow-2xl transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <button
            onClick={() => onMobileOpenChange(false)}
            className="absolute right-3 top-3 rounded-xl p-2 transition-colors hover:bg-muted/60"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>

          <SidebarContent
            role={role}
            title={title}
            subtitle={subtitle}
            navItems={navItems}
            onLogout={onLogout}
          />
        </div>
      </aside>

      <aside className="hidden md:flex md:w-72 md:flex-none md:flex-col md:fixed md:inset-y-0 md:left-0 md:border-r md:border-border md:bg-background md:shadow-sm">
        <SidebarContent
          role={role}
          title={title}
          subtitle={subtitle}
          navItems={navItems}
          onLogout={onLogout}
        />
      </aside>

      <div className="hidden md:block md:w-72 md:flex-none" />
    </>
  )
}
