import { cn } from '@/lib/cn'

/**
 * PageHeader Component - Consistent header for all pages
 */
export function PageHeader({ title, description, actions, className = '', ...props }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6', className)} {...props}>
      <div className="min-w-0">
        {title && <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>}
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

/**
 * PageContainer Component - Wrapper for page content with consistent max-width and padding
 */
export function PageContainer({ children, className = '', ...props }) {
  return (
    <div className={cn('max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * ContentSection Component - Section wrapper with consistent spacing
 */
export function ContentSection({ title, titleSize = 'md', children, className = '', ...props }) {
  const titleClasses = {
    sm: 'text-lg font-semibold',
    md: 'text-xl font-bold',
    lg: 'text-2xl font-bold',
  }[titleSize] || 'text-lg font-semibold'

  return (
    <section className={cn('flex flex-col gap-4', className)} {...props}>
      {title && <h2 className={cn('text-foreground', titleClasses)}>{title}</h2>}
      {children}
    </section>
  )
}

/**
 * SectionDivider Component - Visual separator between sections
 */
export function SectionDivider({ className = '', ...props }) {
  return <div className={cn('h-px bg-outline my-6', className)} {...props} />
}

/**
 * FilterBar Component - Consistent filter/search input group
 */
export function FilterBar({ children, className = '', onReset, ...props }) {
  return (
    <div className={cn('flex flex-col sm:flex-row flex-wrap items-end gap-3 p-4 rounded-lg bg-surface-panel/50 border border-outline/50', className)} {...props}>
      <div className="flex flex-1 flex-wrap items-end gap-3">
        {children}
      </div>
      {onReset && (
        <button type="button" onClick={onReset} className="px-4 py-2 text-sm font-medium rounded-lg bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground transition-colors">
          Reset
        </button>
      )}
    </div>
  )
}

/**
 * FilterLabel Component - Label for filter inputs (maintaining consistent spacing)
 */
export function FilterLabel({ label, children, className = '', ...props }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)} {...props}>
      {label && <span className="text-xs font-semibold text-muted-strong uppercase tracking-wide">{label}</span>}
      {children}
    </label>
  )
}

/**
 * FilterGroup Component - Group multiple filters together
 */
export function FilterGroup({ children, className = '', ...props }) {
  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * EmptyState Component - Display when no content is available
 */
export function EmptyState({ icon: Icon, title, description, action, className = '', ...props }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 px-4 text-center', className)} {...props}>
      {Icon && <Icon size={32} className="text-muted" />}
      {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
      {description && <p className="text-sm text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * StatCard Component - Display statistics/metrics
 */
export function StatCard({ label, value, unit, trend, className = '', ...props }) {
  return (
    <div className={cn('p-4 rounded-lg bg-surface-panel border border-outline', className)} {...props}>
      <p className="text-xs text-muted-strong font-medium mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {trend && <p className={cn('text-xs mt-2 font-medium', trend > 0 ? 'text-success' : 'text-danger')}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</p>}
    </div>
  )
}

/**
 * PaginationControls Component - Consistent pagination UI
 */
export function PaginationControls({ page, pages, total, loading, onPrevious, onNext, className = '', ...props }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 p-4 rounded-lg bg-surface-panel/50 border border-outline/50', className)} {...props}>
      <button type="button" onClick={onPrevious} disabled={page <= 1 || loading} className="px-4 py-2 text-sm font-medium rounded-lg bg-surface-card hover:bg-surface-card-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        Previous
      </button>
      <span className="text-sm text-muted">
        Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pages}</span> ({total} items)
      </span>
      <button type="button" onClick={onNext} disabled={page >= pages || loading} className="px-4 py-2 text-sm font-medium rounded-lg bg-surface-card hover:bg-surface-card-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        Next
      </button>
    </div>
  )
}

/**
 * LoadingSpinner Component - Inline loading indicator
 */
export function LoadingSpinner({ size = 'md', className = '', ...props }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size] || 'w-6 h-6'

  return (
    <div className={cn(`inline-flex animate-spin ${sizeClasses}`, className)} {...props}>
      <svg className="w-full h-full text-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  )
}
