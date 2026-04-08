'use client'

import { X, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/**
 * ResponsiveNotificationPanel - Fixed header with scrollable content
 * Mobile: Full-screen modal overlay
 * Desktop: Can be used as slide-out panel
 */
export function ResponsiveNotificationPanel({
  isOpen,
  onClose,
  onMarkAllRead,
  onClearAll,
  notificationCount = 0,
  unreadCount = 0,
  isLoading = false,
  children,
  title = 'Notifications',
  className = '',
}) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
        role="presentation"
      />

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-border bg-background shadow-2xl md:w-[26rem]',
          'md:rounded-l-2xl',
          className
        )}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-xl md:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground">{title}</p>
              {notificationCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {notificationCount} notification{notificationCount !== 1 ? 's' : ''} ({unreadCount} unread)
                </p>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close notifications"
              className="h-10 w-10 rounded-xl"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={cn(
              'min-h-full',
              !isLoading && notificationCount === 0 && 'flex items-center justify-center'
            )}
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center px-4 py-10">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : notificationCount === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {children}
              </div>
            )}
          </div>
        </div>

        {notificationCount > 0 && (
          <div className="flex gap-2 border-t border-border bg-background p-3 md:p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllRead}
              className="h-11 flex-1 rounded-xl text-xs md:text-sm"
              disabled={isLoading}
            >
              <CheckCircle2 size={16} />
              Mark all read
            </Button>
            {onClearAll ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-11 flex-1 rounded-xl text-xs md:text-sm"
                disabled={isLoading}
              >
                <Trash2 size={16} />
                Clear
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * NotificationItem - Individual notification in the panel
 */
export function NotificationItem({
  title,
  description,
  timestamp,
  isUnread = false,
  action,
  onDismiss,
}) {
  return (
    <div
      className={cn(
        'p-4 transition-colors hover:bg-muted/60 md:p-5',
        isUnread && 'bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            {isUnread && (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
            )}
          </div>

          {description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}

          {timestamp && (
            <p className="mt-1 text-xs text-muted-foreground">{timestamp}</p>
          )}

          {action && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-9 rounded-xl text-xs"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-muted/60"
            aria-label="Dismiss notification"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * EmptyNotifications - Placeholder when no notifications
 */
export function EmptyNotifications({
  title = 'All caught up!',
  description = 'You have no new notifications',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <CheckCircle2 size={24} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground text-center">{description}</p>
    </div>
  )
}
