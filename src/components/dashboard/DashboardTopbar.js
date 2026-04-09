'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'

export function DashboardTopbar({
  role,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onOpenMenu,
  onOpenNotifications,
  unreadCount,
  userLabel,
  sessionIndicator,
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="w-full px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3 min-w-0">
        <Button
          type="button"
          variant="secondary"
              className="h-10 w-10 shrink-0 rounded-xl md:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">{title}</h1>
            <p className="hidden truncate text-sm text-muted-foreground sm:block">{subtitle}</p>
          </div>
        </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <div className="relative w-full lg:w-[22rem]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search"
                className="h-11 rounded-xl pl-9 text-sm"
                aria-label="Search"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Button
                type="button"
                variant="secondary"
                className="relative h-11 w-11 rounded-xl"
                onClick={onOpenNotifications}
                aria-label="Open notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Button>

              {sessionIndicator ? (
                <div className="hidden items-center rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground sm:flex">
                  {sessionIndicator}
                </div>
              ) : null}

              <div className="hidden items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 sm:flex" role="img" aria-label={`${role} user profile`}>
                <RoleAvatar role={role} size="sm" label={`${role} profile icon`} />
                <span className="max-w-[12rem] truncate text-sm font-medium text-foreground">{userLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
