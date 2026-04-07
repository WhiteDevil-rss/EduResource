'use client'

import { GraduationCap, Shield, UserRoundCog } from 'lucide-react'
import { cn } from '@/lib/cn'

const ROLE_ICON = {
  student: GraduationCap,
  faculty: UserRoundCog,
  admin: Shield,
}

export function RoleAvatar({ role = 'student', label, size = 'md', className = '' }) {
  const Icon = ROLE_ICON[role] || GraduationCap
  const sizeClass = size === 'sm' ? 'role-avatar--sm' : 'role-avatar--md'

  return (
    <span className={cn('role-avatar', sizeClass, className)} role="img" aria-label={label || `${role} profile`}>
      <Icon size={size === 'sm' ? 14 : 18} />
    </span>
  )
}
