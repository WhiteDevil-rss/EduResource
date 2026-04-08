'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function AdminNotificationsMenu({
  open,
  notifications,
  unreadCount,
  loading,
  saving,
  error,
  onMarkRead,
  onMarkAllRead,
  onClose,
  formatRelativeUpdate,
}) {
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }

      if (event.key !== 'Tab') {
        return
      }

      const node = panelRef.current
      if (!node) {
        return
      }

      const focusable = Array.from(
        node.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )

      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        id="admin-notifications-panel"
        className="flex h-full w-full max-w-[26rem] flex-col overflow-hidden border-l border-border bg-background shadow-2xl"
        role="dialog"
        aria-modal="false"
        aria-labelledby="admin-notifications-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-xl md:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="admin-notifications-title" className="text-lg font-semibold text-foreground">
                Notifications
              </h3>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {unreadCount} unread update(s)
              </p>
            </div>
            <Button ref={closeButtonRef} type="button" variant="ghost" onClick={onClose} className="h-10 rounded-xl">
              Close
            </Button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          {error ? <p className="px-4 py-4 text-sm text-muted-foreground">{error}</p> : null}
          {loading ? <p className="px-4 py-4 text-sm text-muted-foreground">Fetching updates...</p> : null}
          {!loading && notifications.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">No notifications available.</p>
          ) : null}
          {!loading && notifications.length > 0
            ? notifications.slice(0, 10).map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className="flex w-full items-start justify-between gap-3 border-b border-border px-4 py-4 text-left transition-colors hover:bg-muted/50 md:px-5"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-medium text-foreground">
                      {notification.resourceTitle || notification.message || 'Update'}
                    </strong>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message || 'A new dashboard update is available.'}
                    </p>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {formatRelativeUpdate(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.readAt ? <Badge>New</Badge> : <Badge variant="outline">Read</Badge>}
                </button>
              ))
            : null}
        </div>

        <div className="flex gap-2 border-t border-border bg-background p-3 md:p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onMarkAllRead}
            disabled={saving || unreadCount === 0}
            className="h-11 flex-1 rounded-xl"
          >
            <CheckCircle2 size={14} />
            Mark all as read
          </Button>
        </div>
      </div>
    </div>
  )
}
