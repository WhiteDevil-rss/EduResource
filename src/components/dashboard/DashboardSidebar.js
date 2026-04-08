'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'

function SidebarBody({ role, title, subtitle, navItems, activeSection, onNavigate, onLogout }) {
  return (
    <div className="student-sidebar__inner">
      <div className="student-sidebar__header">
        <div className="student-sidebar__brand">
          <RoleAvatar role={role} label={`${role} workspace`} />
          <div>
            <p className="student-sidebar__title">{title}</p>
            <p className="student-sidebar__subtitle">{subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="student-sidebar__nav" aria-label={`${role} navigation`}>
        <div className="student-sidebar__nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <a
                key={item.id}
                href={item.href}
                className={cn('student-sidebar__link', isActive && 'student-sidebar__link--active')}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>

      <div className="student-sidebar__footer">
        <Button type="button" variant="outline" className="student-sidebar__logout" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function DashboardSidebar({
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
      <aside className="student-sidebar student-sidebar--desktop">
        <SidebarBody
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
        className="student-mobile-nav"
        labelledBy={`${role}-mobile-nav-title`}
      >
        <h2 id={`${role}-mobile-nav-title`} className="sr-only">
          Navigation menu
        </h2>
        <SidebarBody
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
