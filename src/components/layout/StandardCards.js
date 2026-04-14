'use client'

import { cn } from '@/lib/cn'
import { ArrowUpRight, ArrowDownRight, Clock, User as UserIcon, FileText, Shield, Trash2 } from 'lucide-react'

/**
 * StandardCard - The foundational component for the entire UI
 * Features: Clean SaaS aesthetic, standardized padding, soft shadows.
 */
export function StandardCard({
  children,
  className = '',
  hoverable = true,
  variant = 'default',
  ...props
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 backdrop-blur-xl transition-all duration-200',
        hoverable && 'hover:-translate-y-0.5 hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:border-primary/15',
        variant === 'glass' && 'bg-background/40',
        'p-4 md:p-5',
        'shadow-sm',
        className
      )}
      {...props}
    >
      <div className="relative z-10 flex flex-col gap-4">
        {children}
      </div>
    </div>
  )
}

/**
 * UserCard - SaaS-optimized display for user entities
 */
export function UserCard({
  avatar,
  name,
  email,
  role,
  status,
  lastActive,
  authProvider,
  onResetPassword,
  onDelete,
  onToggleStatus,
  className = '',
  onClick,
  ...props
}) {
  return (
    <StandardCard
      className={cn(onClick && 'cursor-pointer active:scale-[0.98]', className)}
      onClick={onClick}
      {...props}
    >
      <div className="flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15">
                {avatar ? (
                  <span className="text-sm font-semibold">{avatar}</span>
                ) : (
                  <UserIcon size={20} />
                )}
              </div>
              {status === 'active' && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {name}
              </h3>
              {email && (
                <p className="truncate text-xs text-muted-foreground">
                  {email}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {role && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary border border-primary/20 capitalize">
                {role.toLowerCase().replace('_ua', '')}
              </span>
            )}
            {status === 'disabled' && (
              <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive border border-destructive/20 uppercase">
                Suspended
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-[10px] font-medium text-muted-strong uppercase tracking-wider mb-0.5">Last Active</p>
            <p className="text-xs font-semibold text-foreground truncate">{lastActive || 'Never'}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-[10px] font-medium text-muted-strong uppercase tracking-wider mb-0.5">Auth Method</p>
            <p className="text-xs font-semibold text-foreground truncate">{authProvider || 'Standard'}</p>
          </div>
        </div>

        {/* Action Bar */}
        {(onResetPassword || onDelete || onToggleStatus) && (
          <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border/20">
            {onToggleStatus && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
                className={cn(
                  "flex-1 h-9 rounded-xl text-xs font-medium border transition-all",
                  status === 'disabled' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10" : "bg-warning/5 border-warning/10 text-amber-600 hover:bg-warning/10"
                )}
              >
                {status === 'disabled' ? 'Reactivate' : 'Suspend'}
              </button>
            )}
            {onResetPassword && (
              <button
                onClick={(e) => { e.stopPropagation(); onResetPassword(); }}
                className="flex-1 h-9 rounded-xl bg-button-ghost border border-border/40 text-muted-foreground text-xs font-medium hover:bg-muted/30 transition-all"
              >
                Reset
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="h-9 w-9 rounded-xl bg-danger/10 border border-danger/15 text-danger flex items-center justify-center hover:bg-danger/15 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </StandardCard>
  )
}

/**
 * Helper to format dates consistently across the admin panel
 */
function formatDisplayDate(date, fallback = 'NA_PROTOCOL') {
  if (!date) return fallback
  try {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).toUpperCase()
  } catch {
    return fallback
  }
}

/**
 * ResourceCard - Clean SaaS-optimized resource display
 */
export function ResourceCard({
  resource,
  title,
  subtitle,
  metadata,
  icon: IconOverride,
  status,
  actions,
  type,
  isAdmin = false,
  onDelete,
  onEdit,
  className = '',
  onClick,
  ...props
}) {
  const resourceTitle = title || resource?.title || 'Unnamed Resource'
  const summary = subtitle || resource?.summary || 'No description provided for this resource.'
  const subject = resource?.subject || metadata?.Subject || 'General'
  const classNameValue = resource?.class || metadata?.Class || 'All'
  const resourceType = type || resource?.type || resource?.format || 'File'
  const downloads = resource?.downloads || 0
  const createdAt = resource?.createdAt
  const metadataEntries = metadata
    ? Object.entries(metadata).filter(([, value]) => Boolean(value)).slice(0, 4)
    : [
        ['Created', formatDisplayDate(createdAt)],
        ['Engagement', `${downloads || 0} Downloads`],
      ]
  const DisplayIcon = status?.icon || IconOverride || FileText

  return (
    <StandardCard
      className={cn(onClick && 'cursor-pointer active:scale-[0.98]', className)}
      onClick={onClick}
      {...props}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary border border-border/40 group-hover:border-primary/20 transition-all">
              <DisplayIcon size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {resourceTitle}
              </h3>
              <p className="line-clamp-1 text-[10px] font-medium text-muted-strong uppercase tracking-wider">
                {subject} • Class {classNameValue}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase">
              {resourceType}
            </div>
            {status ? (
              <div className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {status.label}
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
          {summary}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {metadataEntries.map(([label, value]) => (
            <div key={label} className="p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-[10px] font-medium text-muted-strong uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-xs font-semibold text-foreground truncate">{value}</p>
            </div>
          ))}
        </div>

        {actions ? <div>{actions}</div> : null}

        {isAdmin && (onDelete || onEdit) && (
          <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border/20">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex-1 h-9 rounded-xl bg-button-ghost border border-border/40 text-muted-foreground text-xs font-medium hover:bg-muted/30 transition-all"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="h-9 w-9 rounded-xl bg-danger/10 border border-danger/15 text-danger flex items-center justify-center hover:bg-danger/15 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </StandardCard>
  )
}

/**
 * LogCard - Optimized for activity feeds
 */
export function LogCard({
  user,
  action,
  actionVariant = 'default',
  timestamp,
  details,
  icon: Icon = Clock,
  className = '',
  ...props
}) {
  return (
    <StandardCard className={cn('gap-2 border-l-2',
      actionVariant === 'success' ? 'border-l-emerald-500' :
        actionVariant === 'error' ? 'border-l-rose-500' :
          actionVariant === 'warning' ? 'border-l-amber-500' :
            'border-l-primary/40',
      'hover:border-l-primary transition-all duration-200',
      className)} {...props}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/40 group-hover:border-primary/20">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{user}</span>
            {timestamp && (
              <span className="shrink-0 text-[10px] font-medium text-muted-strong uppercase tracking-wider">
                {timestamp}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {details}
            </p>
            {action && (
              <span className={cn(
                'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border sm:ml-auto',
                actionVariant === 'success' && 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
                actionVariant === 'error' && 'bg-rose-500/5 text-rose-600 border-rose-500/10',
                actionVariant === 'warning' && 'bg-amber-500/5 text-amber-600 border-amber-500/10',
                'bg-primary/5 text-primary border-primary/10'
              )}>
                {action}
              </span>
            )}
          </div>
        </div>
      </div>
    </StandardCard>
  )
}

/**
 * StatCard - Impactful metrics display
 */
export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  description,
  color = 'primary',
  className = '',
  ...props
}) {
  const isTrendUp = trend === 'up'

  const colorConfig = {
    primary: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/10' },
    success: { bg: 'bg-emerald-500/5', text: 'text-emerald-500', border: 'border-emerald-500/10' },
    warning: { bg: 'bg-amber-500/5', text: 'text-amber-500', border: 'border-amber-500/10' },
    error: { bg: 'bg-rose-500/5', text: 'text-rose-500', border: 'border-rose-500/10' },
    info: { bg: 'bg-sky-500/5', text: 'text-sky-500', border: 'border-sky-500/10' },
  }[color] || { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/10' }

  return (
    <StandardCard className={cn('relative h-full gap-4 transition-all group shadow-sm', className)} {...props}>
      <div className="flex items-start justify-between">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border transition-all", colorConfig.bg, colorConfig.text, colorConfig.border)}>
          {Icon ? <Icon size={20} /> : <Shield size={20} />}
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border',
            isTrendUp ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : 'bg-rose-500/5 text-rose-600 border-rose-500/10'
          )}>
            {isTrendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{trendLabel}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-strong">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl transition-colors group-hover:text-primary">
            {value}
          </h4>
          {description && (
            <span className="text-[10px] font-medium text-muted-strong uppercase tracking-wider hidden lg:inline">{description}</span>
          )}
        </div>
      </div>
    </StandardCard>
  )
}
