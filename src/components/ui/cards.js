import { cn } from '@/lib/cn'

/**
 * UserCard Component - Displays user information with avatar and role badge
 */
export function UserCard({ user, className = '', children, ...props }) {
  const { name, email, role } = user || {}

  return (
    <div className={cn('flex items-start justify-between gap-4 p-4 rounded-lg bg-surface-card hover:bg-surface-card-high transition-colors', className)} {...props}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-white">{(name || email || '?')[0]?.toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{name || email || 'Unknown'}</p>
          <p className="text-xs text-muted truncate">{email}</p>
          {role && <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-primary/20 text-primary font-medium">{role}</span>}
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * ResourceCard Component - Displays resource information
 */
export function ResourceCard({ resource, className = '', onView, onDownload, ...props }) {
  const { title, subject, class: classValue, fileType, uploadedBy } = resource || {}

  return (
    <div className={cn('flex flex-col gap-3 p-5 rounded-lg bg-surface-card hover:bg-surface-card-high transition-colors border border-outline', className)} {...props}>
      <div>
        <p className="font-semibold text-foreground line-clamp-2">{title || 'Untitled Resource'}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted">
          <span>{classValue || 'CORE 101'}</span>
          <span>•</span>
          <span>{subject || 'General'}</span>
          {fileType && (
            <>
              <span>•</span>
              <span>{fileType.toUpperCase()}</span>
            </>
          )}
        </div>
      </div>
      {uploadedBy && (
        <div className="text-xs text-muted-strong">
          By <span className="text-foreground font-medium">{uploadedBy}</span>
        </div>
      )}
      {(onView || onDownload) && (
        <div className="flex items-center gap-2 pt-2 border-t border-outline">
          {onView && (
            <button type="button" onClick={onView} className="flex-1 px-3 py-2 text-xs font-medium rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
              View
            </button>
          )}
          {onDownload && (
            <button type="button" onClick={onDownload} className="flex-1 px-3 py-2 text-xs font-medium rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors">
              Download
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * LogCard Component - Displays audit/activity log entries
 */
export function LogCard({ log, className = '', ...props }) {
  const { userName, userEmail, action, description, status, timestamp, module } = log || {}
  const isError = status === 'FAILED'

  return (
    <div className={cn('flex items-center justify-between gap-4 p-4 rounded-lg bg-surface-card hover:bg-surface-card-high transition-colors border border-outline/50', className)} {...props}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{userName || userEmail || 'Unknown'}</p>
            <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', isError ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success')}>
              {status || 'SUCCESS'}
            </span>
          </div>
          <p className="text-sm text-muted truncate">{action}</p>
          {description && <p className="text-xs text-muted-strong line-clamp-2 mt-1">{description}</p>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-muted whitespace-nowrap">{timestamp}</p>
        {module && <p className="text-xs text-muted-strong mt-1">{module}</p>}
      </div>
    </div>
  )
}

/**
 * SectionCard Component - Wrapper for content sections
 */
export function SectionCard({ className = '', children, ...props }) {
  return (
    <div className={cn('rounded-xl bg-surface-card border border-outline shadow-sm overflow-hidden', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * ContentGrid Component - Grid layout for cards
 */
export function ContentGrid({ className = '', children, columns = 3, ...props }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[Math.min(columns, 4)] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={cn(`grid ${gridClass} gap-4`, className)} {...props}>
      {children}
    </div>
  )
}

/**
 * ContentList Component - Vertical list layout for cards
 */
export function ContentList({ className = '', children, gap = 4, ...props }) {
  const gapClass = {
    2: 'space-y-2',
    3: 'space-y-3',
    4: 'space-y-4',
    5: 'space-y-5',
    6: 'space-y-6',
  }[gap] || 'space-y-4'

  return (
    <div className={cn(`flex flex-col ${gapClass}`, className)} {...props}>
      {children}
    </div>
  )
}
