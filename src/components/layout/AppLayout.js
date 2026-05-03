'use client'

import { useState } from 'react'
import { ResponsiveSidebar } from './ResponsiveSidebar'
import { ResponsiveTopbar } from './ResponsiveTopbar'
import { GlobalErrorBoundary } from '@/components/ErrorBoundary'
import { cn } from '@/lib/cn'

/**
 * AppLayout - Main application architecture
 * Implements a robust mobile-first layout with sidebar, sticky topbar, and main content area.
 */
export function AppLayout({
  user,
  role,
  userLabel,
  sidebarTitle,
  sidebarSubtitle,
  navSections,
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
    <div className={cn('app-shell flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-transparent text-foreground md:flex-row', className)}>
      <ResponsiveSidebar
        user={user}
        role={role}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        navSections={navSections}
        navItems={navItems}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden">
        <ResponsiveTopbar
          title={topbarTitle}
          subtitle={topbarSubtitle}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenNotifications={onOpenNotifications}
          unreadCount={unreadCount}
          userLabel={userLabel}
          onLogout={onLogout}
        />

        <main className="flex-1 w-full max-w-full overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-full lg:max-w-[1400px] animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlobalErrorBoundary>
              {children}
            </GlobalErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
