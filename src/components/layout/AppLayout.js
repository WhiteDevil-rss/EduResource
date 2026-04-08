'use client'

import { useState } from 'react'
import { ResponsiveSidebar } from './ResponsiveSidebar'
import { ResponsiveTopbar } from './ResponsiveTopbar'
import { cn } from '@/lib/cn'

/**
 * AppLayout - Main application wrapper
 * Mobile-first responsive layout with sidebar + topbar + content area
 */
export function AppLayout({
  role,
  userLabel,
  sidebarTitle,
  sidebarSubtitle,
  navItems,
  topbarTitle,
  topbarSubtitle,
  searchValue,
  onSearchChange,
  onOpenNotifications,
  unreadCount,
  onLogout,
  children,
  className = '',
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={cn('flex min-h-dvh w-full overflow-hidden bg-background', className)}>
      <ResponsiveSidebar
        role={role}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        navItems={navItems}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ResponsiveTopbar
          title={topbarTitle}
          subtitle={topbarSubtitle}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenNotifications={onOpenNotifications}
          unreadCount={unreadCount}
          userLabel={userLabel}
        />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
