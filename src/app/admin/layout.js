'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { isSuperAdmin } from '@/lib/admin-protection'
import { formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'
import { Button } from '@/components/ui/button'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminNotificationsMenu } from '@/components/admin/AdminNotificationsMenu'
import { ADMIN_NAV_SECTIONS } from '@/components/admin/adminNav'
import { cn } from '@/lib/cn'

async function fetchNotifications() {
  const response = await fetch('/api/notifications', { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Could not load notifications.')
  }
  return payload
}

export default function AdminLayout({ children }) {
  const router = useRouter()
  const { user, role, loading, logout } = useAuth()
  const sessionTimer = useSessionTimer()

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationsButtonRef = useRef(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (role !== 'admin' || !isSuperAdmin(user)) {
      router.replace('/dashboard/admin')
    }
  }, [loading, role, router, user])

  useEffect(() => {
    if (!user || role !== 'admin' || !isSuperAdmin(user)) {
      return
    }

    let mounted = true

    const load = async () => {
      setNotificationsLoading(true)
      setNotificationsError('')
      try {
        const payload = await fetchNotifications()
        if (!mounted) return
        setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
        setUnreadCount(Number(payload?.unreadCount || 0))
      } catch (error) {
        if (!mounted) return
        setNotificationsError(error.message || 'Could not load notifications.')
      } finally {
        if (mounted) setNotificationsLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [role, user])

  useEffect(() => {
    if (!user || role !== 'admin' || !isSuperAdmin(user)) {
      return
    }

    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName?.toLowerCase()
      const isTypingField = targetTag === 'input' || targetTag === 'textarea' || event.target?.isContentEditable
      if (isTypingField) {
        return
      }

      if (event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setNotificationsOpen((open) => !open)
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setMobileNavOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [role, user])

  const markNotificationRead = async (notificationId) => {
    try {
      setNotificationsSaving(true)
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update notification.')
      }
      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setUnreadCount(Number(payload?.unreadCount || 0))
    } catch (error) {
      setNotificationsError(error.message || 'Could not update notification.')
    } finally {
      setNotificationsSaving(false)
    }
  }

  const markAllRead = async () => {
    try {
      setNotificationsSaving(true)
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not clear notifications.')
      }
      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setUnreadCount(Number(payload?.unreadCount || 0))
    } catch (error) {
      setNotificationsError(error.message || 'Could not clear notifications.')
    } finally {
      setNotificationsSaving(false)
    }
  }

  useEffect(() => {
    if (notificationsOpen) {
      return
    }
    notificationsButtonRef.current?.focus()
  }, [notificationsOpen])

  if (loading || !user || role !== 'admin' || !isSuperAdmin(user)) {
    return null
  }

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-background">
      <a href="#admin-main-content" className="skip-link">
        Skip to main content
      </a>

      <AdminSidebar
        sections={ADMIN_NAV_SECTIONS}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl md:px-6 md:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-10 rounded-xl md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground md:text-xl">Super Admin Console</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Category-driven operations across security, users, monitoring, and system tooling.
                Shortcuts: Shift+N for notifications and Cmd/Ctrl+B for the menu.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Button
              ref={notificationsButtonRef}
              type="button"
              variant="outline"
              className="relative h-11 w-11 rounded-xl"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label="Open notifications"
              aria-expanded={notificationsOpen}
              aria-controls="admin-notifications-panel"
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Button>

            {sessionTimer.isVisible ? (
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2 text-sm shadow-sm',
                  sessionTimer.isWarning
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-border/70 bg-card text-foreground'
                )}
                role="status"
                aria-live="polite"
              >
                <span>Session {sessionTimer.formatted}</span>
                <Button type="button" variant="ghost" className="h-9 rounded-xl px-3" onClick={sessionTimer.onExtendSession}>
                  Extend
                </Button>
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2" role="img" aria-label="super admin profile">
              <span className="text-sm font-medium text-foreground">{getDisplayName(user?.email, 'Super Admin')}</span>
            </div>
          </div>
        </header>

        <AdminNotificationsMenu
          open={notificationsOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          loading={notificationsLoading}
          saving={notificationsSaving}
          error={notificationsError}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllRead}
          onClose={() => setNotificationsOpen(false)}
          formatRelativeUpdate={formatRelativeUpdate}
        />

        <p className="sr-only" role="status" aria-live="polite">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}
        </p>

        <main id="admin-main-content" className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
