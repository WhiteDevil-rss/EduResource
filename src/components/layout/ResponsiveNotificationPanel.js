'use client'

import { X, Trash2, CheckCircle2, Bell, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/components/ui/AppIcon'
import { cn } from '@/lib/cn'

/**
 * ResponsiveNotificationPanel - The architected communication hub
 * Features: Fixed header/footer, independent scrollable content, responsive slide-over.
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
  return (
    <>
      {/* Overlay Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] transition-all duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Slide-over Panel */}
      <aside
        className={cn(
          'ui-panel fixed inset-y-0 right-0 z-[110] flex w-full max-w-full flex-col overflow-x-hidden bg-background/90 shadow-2xl transition-transform duration-500 ease-out backdrop-blur-xl md:w-[28rem]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          'rounded-none border-l border-border/40 md:rounded-l-2xl md:rounded-r-none',
          className
        )}
      >
        {/* Fixed Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-6 md:h-20">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tighter text-foreground uppercase">{title}</h2>
              {unreadCount > 0 && (
                <span className="flex h-5 w-10 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-black text-primary ring-1 ring-primary/20 animate-pulse">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {notificationCount > 0 
                ? `${notificationCount} activities recorded in your feed`
                : 'Your activity stream is currently empty'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/35 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
            aria-label="Close notification panel"
          >
            <AppIcon icon={X} size={20} interactive />
          </button>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Feed...</p>
            </div>
          ) : notificationCount === 0 ? (
            <EmptyNotifications />
          ) : (
            <div className="divide-y divide-border/30">
              {children}
            </div>
          )}
        </div>

        {/* Fixed Footer with Actions */}
        {notificationCount > 0 && (
          <div className="ui-panel-muted flex shrink-0 gap-3 border-x-0 border-b-0 border-t border-border/40 p-6">
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllRead}
              className="h-12 flex-1 gap-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all hover:bg-primary hover:text-white"
              disabled={isLoading}
            >
              <CheckCircle2 size={16} />
              Read All
            </Button>
            {onClearAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-12 flex-1 gap-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all hover:bg-red-500 hover:text-white"
                disabled={isLoading}
              >
                <Trash2 size={16} />
                Clear
              </Button>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

/**
 * NotificationItem - Architected item for the feed
 */
export function NotificationItem({
  title,
  description,
  timestamp,
  isUnread = false,
  action,
  icon: Icon = Bell,
  onDismiss,
}) {
  return (
    <div
      className={cn(
        'group relative p-5 transition-all duration-300 hover:bg-primary/8',
        isUnread && 'bg-primary/5'
      )}
    >
      {isUnread && (
        <div className="absolute left-0 top-0 h-full w-[3px] bg-primary rounded-r-full" />
      )}

      <div className="flex items-start gap-4">
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/45 text-muted-foreground transition-all group-hover:scale-110 group-hover:bg-primary/12 group-hover:text-primary',
          isUnread && 'bg-primary/20 text-primary'
        )}>
          <AppIcon icon={Icon} size={20} active={isUnread} interactive={!isUnread} className={cn(!isUnread && 'group-hover:text-primary')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn('truncate text-[13px] font-bold tracking-tight', isUnread ? 'text-foreground' : 'text-muted-foreground')}>
              {title}
            </h4>
            {timestamp && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground transition-opacity group-hover:opacity-100">
                {timestamp}
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            {action ? (
              <button
                onClick={action.onClick}
                className="text-xs font-black uppercase tracking-wider text-primary hover:underline"
              >
                {action.label}
              </button>
            ) : <div />}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                aria-label="Dismiss notification"
              >
                <AppIcon icon={X} size={14} className="text-inherit" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * EmptyNotifications - Refined empty state
 */
export function EmptyNotifications({
  title = 'Your Feed is Clear',
  description = 'You have no new notifications to review right now.',
}) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center px-10 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/30 text-muted-foreground/60">
          <AppIcon icon={Sparkles} size={40} />
        </div>
      </div>
      <h3 className="text-base font-black uppercase tracking-widest text-foreground">{title}</h3>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{description}</p>
    </div>
  )
}
