'use client'

import { Menu, Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

/**
 * ResponsiveTopbar - Sticky header with search and notifications
 * Mobile: Stacked layout
 * Desktop: Horizontal layout
 */
export function ResponsiveTopbar({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onOpenMenu,
  onOpenNotifications,
  unreadCount,
  userLabel,
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="w-full px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl md:hidden"
              onClick={onOpenMenu}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </Button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">{title}</h1>
              {subtitle && (
                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="relative w-full lg:w-[22rem]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 rounded-xl pl-9 text-sm"
                aria-label="Search"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-xl"
                onClick={onOpenNotifications}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-[10px] bg-red-500">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {userLabel && (
                <div className="hidden items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 sm:flex">
                  <span className="max-w-[12rem] truncate text-sm font-medium text-foreground">
                    {userLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
