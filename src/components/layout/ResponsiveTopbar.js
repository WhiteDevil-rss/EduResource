'use client'

import { Menu, Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppIcon } from '@/components/ui/AppIcon'
import { ThemeToggle } from '@/components/ThemeToggle'

/**
 * ResponsiveTopbar - Architected header system
 * Sticky topbar with dynamic search, notifications, and user context.
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
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-full lg:max-w-[1400px] overflow-x-hidden px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">

          {/* Left Section: Menu & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl hover:bg-muted/50 md:hidden"
              onClick={onOpenMenu}
              aria-label="Open menu"
            >
              <AppIcon icon={Menu} size={22} interactive className="text-muted-foreground hover:text-foreground" />
            </Button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-foreground md:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-xs font-medium text-muted-foreground lg:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Section: Search & Actions */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Contextual Search - Hidden on very small screens, visible on md+ */}
            <div className="relative hidden w-56 items-center sm:flex lg:w-72 xl:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Search resources, users, or settings..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 w-full rounded-2xl bg-muted/40 pl-11 text-sm font-medium border-transparent transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                aria-label="Global search across the platform"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <ThemeToggle className="h-11 w-11 rounded-xl border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground" />
              <Button
                variant="ghost"
                size="icon"
                className="group relative h-11 w-11 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all active:scale-95"
                onClick={onOpenNotifications}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <AppIcon icon={Bell} size={20} active={unreadCount > 0} interactive className="group-hover:text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute right-2.5 top-2.5 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <Badge className="relative flex h-4 w-4 items-center justify-center p-0 text-[9px] font-bold bg-red-500 border-2 border-background">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  </span>
                )}
              </Button>

              {userLabel && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-muted/30 px-3.5 py-1.5 shadow-sm transition-all hover:bg-muted/50">
                  <div className="hidden flex-col items-end sm:flex">
                    <span className="max-w-[100px] truncate text-[13px] font-bold text-foreground">
                      {userLabel}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Active Now
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <AppIcon icon={User} size={16} active className="shrink-0" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Row - Visible only on mobile */}
        <div className="pb-4 sm:hidden">
          <div className="relative flex items-center">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 w-full rounded-2xl bg-muted/40 pl-11 text-sm font-medium border-transparent transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
              aria-label="Search"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
