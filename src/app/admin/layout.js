'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { isAdminUser, isSuperAdmin } from '@/lib/admin-protection'
import { getDisplayName } from '@/lib/demo-content'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import {
  AppLayout,
  ResponsiveNotificationPanel,
  NotificationItem,
} from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'
import { ADMIN_NAV_SECTIONS } from '@/components/admin/adminNav'
import { cn } from '@/lib/cn'

async function fetchNotifications() {
  const response = await fetch('/api/notifications?limit=50&page=1', { cache: 'no-store' })
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

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [, setNotificationsSaving] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (loading) {
      return
    }

    // Only redirect with 'unauthorized' reason if user is present but not an admin
    // If user is null, it's a simple unauthenticated state which is handled by AuthGuard/login redirect
    if (user && !isAdminUser(user, role)) {
      router.replace('/login?reason=unauthorized')
    } else if (!user) {
      router.replace('/login')
    }
  }, [loading, role, router, user])

  useEffect(() => {
    if (loading || !isAdminUser(user, role)) {
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
  }, [loading, role, user])

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

  const handleOpenNotifications = () => setNotificationsOpen(true)
  const handleCloseNotifications = () => setNotificationsOpen(false)

  if (loading || !user || !isAdminUser(user, role)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-muted-foreground">
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="max-w-md text-sm font-medium leading-relaxed">
            Preparing the admin console...
          </p>
        </div>
      </div>
    )
  }

  const notificationItems = notifications.map((n) => (
    <NotificationItem
      key={n.id}
      title={n.title}
      description={n.message}
      timestamp={n.createdAt}
      isUnread={!n.isRead}
      onDismiss={() => markNotificationRead(n.id)}
    />
  ))

  return (
    <AppLayout
      user={user}
      role="admin"
      userLabel={getDisplayName(user?.email, isSuperAdmin(user) ? 'Super Admin' : 'Admin')}
      sidebarTitle="EDUCATIONAM"
      sidebarSubtitle="System Intelligence"
      navSections={ADMIN_NAV_SECTIONS}
      navItems={ADMIN_NAV_SECTIONS.flatMap(s => s.items)}
      topbarTitle="Admin Console"
      topbarSubtitle="Manage system security, users, and resources"
      onOpenNotifications={handleOpenNotifications}
      unreadCount={unreadCount}
      onLogout={logout}
    >
      {/* Session Monitor */}
      {sessionTimer.isVisible && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <StandardCard
            className={cn(
              "w-64 p-4 border-2 transition-colors",
              sessionTimer.isWarning ? "border-amber-500 bg-amber-500/10" : "border-primary/20"
            )}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Session Expires</span>
                <span className={cn("text-sm font-black tracking-tighter", sessionTimer.isWarning ? "text-amber-600" : "text-primary")}>
                  {sessionTimer.formatted}
                </span>
              </div>
              <Button
                onClick={sessionTimer.onExtendSession}
                variant={sessionTimer.isWarning ? "default" : "outline"}
                className="h-9 w-full rounded-xl font-bold uppercase tracking-widest text-[10px]"
              >
                Extend Session
              </Button>
            </div>
          </StandardCard>
        </div>
      )}

      {children}

      <ResponsiveNotificationPanel
        isOpen={notificationsOpen}
        onClose={handleCloseNotifications}
        onMarkAllRead={markAllRead}
        notificationCount={notifications.length}
        unreadCount={unreadCount}
        isLoading={notificationsLoading}
        error={notificationsError}
      >
        {notificationItems}
      </ResponsiveNotificationPanel>
    </AppLayout>
  )
}
