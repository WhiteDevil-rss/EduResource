'use client'

import { Bell, ChevronsUpDown, LogOut, Menu, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppIcon } from '@/components/ui/AppIcon'
import { ThemeToggle } from '@/components/ThemeToggle'
import { IconButton } from '@/components/ui/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'

/**
 * ResponsiveTopbar - Architected header system
 * Sticky topbar with dynamic search, notifications, and user context.
 */
export function ResponsiveTopbar({
  title,
  subtitle,
  searchValue = '',
  onSearchChange,
  onOpenMenu,
  onOpenNotifications,
  unreadCount,
  userLabel,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-full lg:max-w-[1400px] overflow-x-hidden px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4 md:h-[4.75rem]">

          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              className="size-10 shrink-0 rounded-xl px-0 md:hidden"
              onClick={onOpenMenu}
              aria-label="Open menu"
            >
              <AppIcon icon={Menu} size={20} interactive className="text-muted-foreground hover:text-foreground" />
            </Button>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Control Surface
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden truncate text-sm text-muted-foreground lg:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative hidden w-56 items-center sm:flex lg:w-72 xl:w-[22rem]">
              <Search size={16} className="pointer-events-none absolute left-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search resources, users, or settings..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-11 w-full rounded-xl border-border/60 bg-card/80 pl-11 text-sm"
                aria-label="Global search across the platform"
              />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <IconButton
                icon={Bell}
                label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                onClick={onOpenNotifications}
                badge={unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : null}
              />

              {userLabel ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card/85 px-3 py-2 text-left transition',
                        'hover:border-primary/20 hover:bg-card'
                      )}
                    >
                      <div className="hidden min-w-0 sm:block">
                        <p className="max-w-[140px] truncate text-sm font-semibold text-foreground">{userLabel}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Profile</p>
                      </div>
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <User size={16} aria-hidden="true" />
                      </span>
                      <ChevronsUpDown size={14} className="hidden text-muted-foreground sm:block" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <User size={16} aria-hidden="true" />
                      Signed in as {userLabel}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onLogout}>
                      <LogOut size={16} aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>

        <div className="pb-4 sm:hidden">
          <div className="relative flex items-center">
            <Search size={16} className="pointer-events-none absolute left-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-11 w-full rounded-xl border-border/60 bg-card/80 pl-11 text-sm"
              aria-label="Search"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
