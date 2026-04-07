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
}) {
  return (
    <header className="student-topbar">
      <div className="student-topbar__left">
        <Button
          type="button"
          variant="ghost"
          className="student-topbar__menu"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </Button>
        <div>
          <h1 className="student-topbar__title">{title}</h1>
          <p className="student-topbar__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="student-topbar__right">
        <label className="student-search" aria-label="Search">
          <Search size={16} />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            className="student-search__input"
          />
        </label>

        <Button
          type="button"
          variant="outline"
          className="student-topbar__icon"
          onClick={onOpenNotifications}
          aria-label="Open notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 ? <span className="student-topbar__badge">{unreadCount}</span> : null}
        </Button>

        <div className="student-topbar__profile" role="img" aria-label={`${role} user profile`}>
          <RoleAvatar role={role} size="sm" label={`${role} profile icon`} />
          <span>{userLabel}</span>
        </div>
      </div>
    </header>
  )
}
