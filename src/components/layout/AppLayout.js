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
    <div className={cn('flex min-h-screen w-full flex-col bg-background text-foreground md:flex-row', className)}>
      {/* Sidebar Navigation */}
      <ResponsiveSidebar
        user={user}
        role={role}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        navItems={navItems}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Topbar */}
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

        {/* Content Section with standardized container */}
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1400px] animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GlobalErrorBoundary>
              {children}
            </GlobalErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
