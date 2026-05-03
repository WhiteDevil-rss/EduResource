'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { filterNavItemsByRole } from '@/lib/feature-access'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'

function SidebarBody({ user, role, title, subtitle, navItems, activeSection, onNavigate, onLogout }) {
  const visibleNavItems = filterNavItemsByRole(user || { role }, navItems)

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
            const isActive = activeSection === item.id
            return (
              <a
                key={item.id || item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-border px-3 pt-4 md:px-4">
        <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-xl text-sm" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function DashboardSidebar({
  user,
  role,
  title,
  subtitle,
  navItems,
  activeSection,
  onNavigate,
  mobileOpen,
  onMobileOpenChange,
  onLogout,
}) {
  return (
    <>
      <aside className="hidden md:flex md:h-dvh md:w-72 md:flex-none md:flex-col md:border-r md:border-border md:bg-background md:shadow-sm">
        <SidebarBody
          user={user}
          role={role}
          title={title}
          subtitle={subtitle}
          navItems={navItems}
          activeSection={activeSection}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </aside>

      <Dialog
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
        className="md:hidden"
        labelledBy={`${role}-mobile-nav-title`}
      >
        <h2 id={`${role}-mobile-nav-title`} className="sr-only">
          Navigation menu
        </h2>
        <SidebarBody
          user={user}
          role={role}
          title={title}
          subtitle={subtitle}
          navItems={navItems}
          activeSection={activeSection}
          onNavigate={(section) => {
            onNavigate(section)
            onMobileOpenChange(false)
          }}
          onLogout={onLogout}
        />
      </Dialog>
    </>
  )
}
