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
    <div className="student-notification-panel-wrap">
      <div
        ref={panelRef}
        id="admin-notifications-panel"
        className="admin-v2-notifications glass-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="admin-notifications-title"
      >
        <div className="admin-v2-notifications__header">
          <div>
            <h3 id="admin-notifications-title">Notifications</h3>
            <p aria-live="polite">{unreadCount} unread update(s)</p>
          </div>
          <Button ref={closeButtonRef} type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="admin-v2-notifications__content custom-scrollbar">
          {error ? <p className="student-muted-text">{error}</p> : null}
          {loading ? <p className="student-muted-text">Fetching updates...</p> : null}
          {!loading && notifications.length === 0 ? <p className="student-muted-text">No notifications available.</p> : null}
          {!loading && notifications.length > 0
            ? notifications.slice(0, 10).map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className="admin-v2-notifications__item"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <div className="admin-v2-notifications__item-copy">
                    <strong>{notification.resourceTitle || notification.message || 'Update'}</strong>
                    <p>{notification.message || 'A new dashboard update is available.'}</p>
                    <span>{formatRelativeUpdate(notification.createdAt)}</span>
                  </div>
                  {!notification.readAt ? <Badge>New</Badge> : <Badge variant="outline">Read</Badge>}
                </button>
              ))
            : null}
        </div>

        <div className="admin-v2-notifications__footer">
          <Button
            type="button"
            variant="outline"
            onClick={onMarkAllRead}
            disabled={saving || unreadCount === 0}
          >
            <CheckCircle2 size={14} />
            Mark all as read
          </Button>
        </div>
      </div>
    </div>
  )
}
