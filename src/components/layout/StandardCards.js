'use client'

import { cn } from '@/lib/cn'

/**
 * StandardCard - Base card component
 * Mobile-first responsive styling: rounded-xl, shadow-sm, p-4 md:p-6
 */
export function StandardCard({
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm',
        'flex flex-col gap-2 p-4 md:p-5',
        'transition-shadow hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * UserCard - User information card
 * Displays: Avatar + Name + Email + Role badge + Actions
 */
export function UserCard({
  avatar,
  name,
  email,
  role,
  actions,
  className = '',
  onClick,
  ...props
}) {
  return (
    <StandardCard
      className={cn('cursor-pointer', className)}
      onClick={onClick}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {avatar && (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-sm font-semibold text-white">
              {avatar}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{name}</p>
            {email && (
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            )}
          </div>
        </div>

        {role && (
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {role}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {actions}
        </div>
      )}
    </StandardCard>
  )
}

/**
 * ResourceCard - Resource information card
 * Displays: Title + Metadata (class, subject) + Actions
 */
export function ResourceCard({
  title,
  subtitle,
  metadata = {},
  actions,
  status,
  className = '',
  onClick,
  ...props
}) {
  return (
    <StandardCard
      className={cn('cursor-pointer', className)}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {status && (
          <span className={cn(
            'inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
            status.variant === 'success' && 'bg-emerald-500/10 text-emerald-600',
            status.variant === 'warning' && 'bg-amber-500/10 text-amber-600',
            status.variant === 'error' && 'bg-rose-500/10 text-rose-600',
            status.variant === 'info' && 'bg-sky-500/10 text-sky-600',
            !status.variant && 'bg-muted text-muted-foreground'
          )}>
            {status.label}
          </span>
        )}
      </div>

      {Object.keys(metadata).length > 0 && (
        <div className="grid grid-cols-2 gap-3 py-1 text-xs md:grid-cols-3">
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="font-medium text-muted-foreground">{key}</span>
              <span className="truncate font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {actions}
        </div>
      )}
    </StandardCard>
  )
}

/**
 * LogCard - Activity/audit log entry card
 * Displays: User + Action badge + Timestamp (right-aligned)
 */
export function LogCard({
  user,
  action,
  actionVariant = 'default',
  timestamp,
  details,
  className = '',
  ...props
}) {
  return (
    <StandardCard className={cn('gap-3', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{user}</p>
          {details && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{details}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {action && (
            <span className={cn(
              'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
              actionVariant === 'success' && 'bg-emerald-500/10 text-emerald-600',
              actionVariant === 'warning' && 'bg-amber-500/10 text-amber-600',
              actionVariant === 'error' && 'bg-rose-500/10 text-rose-600',
              actionVariant === 'info' && 'bg-sky-500/10 text-sky-600',
              actionVariant === 'default' && 'bg-muted text-muted-foreground'
            )}>
              {action}
            </span>
          )}

          {timestamp && (
            <span className="whitespace-nowrap text-xs text-muted-foreground">{timestamp}</span>
          )}
        </div>
      </div>
    </StandardCard>
  )
}

/**
 * StatCard - Metric/KPI display card
 * Displays: Label + Value + Optional trend
 */
export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  className = '',
  ...props
}) {
  const isTrendUp = trend === 'up'
  const trendColor = isTrendUp ? 'text-green-600' : 'text-red-600'

  return (
    <StandardCard className={cn('gap-3', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {trend && (
          <span className={cn('text-xs font-semibold', trendColor)}>
            {isTrendUp ? '↑' : '↓'} {trendLabel}
          </span>
        )}
      </div>

      <p className="text-3xl font-bold text-foreground md:text-4xl">{value}</p>
    </StandardCard>
  )
}
