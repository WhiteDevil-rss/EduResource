'use client'

import { useEffect, useState } from 'react'
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
  const [activeAnchor, setActiveAnchor] = useState('')

  useEffect(() => {
    const allItems = [
      ...(navItems || []),
      ...(navSections || []).flatMap(s => s.items || [])
    ]
    const anchors = allItems.filter(item => item?.href?.startsWith('#'))
    if (anchors.length === 0) {
      setActiveAnchor('')
      return
    }

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -75% 0px', // Trigger when section is in the upper part of the viewport
      threshold: 0
    }

    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveAnchor('#' + entry.target.id)
        }
      })
    }, observerOptions)

    anchors.forEach(item => {
      const id = item.href.slice(1)
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [navItems, navSections])

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
        activeAnchor={activeAnchor}
        onAnchorClick={setActiveAnchor}
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
