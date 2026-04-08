'use client'

import { cn } from '@/lib/cn'

/**
 * PageContainer - Main content wrapper
 * Mobile-first responsive container with consistent max-width and padding
 */
export function PageContainer({
  children,
  className = '',
  maxWidth = 'max-w-[1400px]',
  ...props
}) {
  return (
    <div
      className={cn(
        maxWidth,
        'mx-auto w-full min-h-full',
        'px-4 md:px-6',
        'py-4 md:py-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * ContentSection - Section wrapper with consistent spacing
 * Mobile-first spacing: gap-4, responsive title sizes
 */
export function ContentSection({
  title,
  subtitle,
  titleSize = 'md',
  actions,
  children,
  className = '',
  noPaddingBottom = false,
  ...props
}) {
  const titleSizes = {
    sm: 'text-lg md:text-xl font-semibold',
    md: 'text-xl md:text-2xl font-bold',
    lg: 'text-2xl md:text-3xl font-bold',
  }

  return (
    <section className={cn('flex flex-col gap-4 md:gap-6', !noPaddingBottom && 'pb-4 md:pb-6', className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className={cn('text-foreground', titleSizes[titleSize] || titleSizes.md)}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{subtitle}</p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3">{actions}</div>
          )}
        </div>
      )}

      {/* Content */}
      {children}
    </section>
  )
}

/**
 * Section Divider
 */
export function SectionDivider({
  className = '',
  ...props
}) {
  return <div className={cn('my-6 h-px bg-border md:my-8', className)} {...props} />
}

/**
 * Grid Container - Mobile-first responsive grid
 * Mobile: grid-cols-1
 * Tablet: md:grid-cols-2
 * Desktop: lg:grid-cols-3
 */
export function GridContainer({
  children,
  columns = 3,
  gap = 'gap-4 md:gap-6',
  className = '',
  ...props
}) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={cn('grid min-w-0', colClasses, gap, className)} {...props}>
      {children}
    </div>
  )
}

/**
 * FlexContainer - Flexible container with responsive direction
 * Mobile: flex-col (stacked)
 * Desktop: flex-row (horizontal)
 */
export function FlexContainer({
  children,
  direction = 'col',
  gap = 'gap-4 md:gap-6',
  className = '',
  ...props
}) {
  const dirClass = direction === 'row' ? 'flex-col md:flex-row' : 'flex-col'

  return (
    <div className={cn('flex min-w-0', dirClass, gap, className)} {...props}>
      {children}
    </div>
  )
}

/**
 * ScrollableContainer - For long lists/sections
 * Mobile: max-h-[60vh]
 * Desktop: max-h-[70vh]
 */
export function ScrollableContainer({
  children,
  maxHeight = 'max-h-[60vh] md:max-h-[70vh]',
  className = '',
  ...props
}) {
  return (
    <div
      className={cn(
        maxHeight,
        'overflow-y-auto overflow-x-hidden',
        'rounded-xl border border-border/70 bg-card shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CompactSection - Dense layout for information-heavy sections
 */
export function CompactSection({
  children,
  className = '',
  ...props
}) {
  return (
    <div className={cn('flex flex-col gap-2 md:gap-3', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * MetricGrid - For displaying KPI cards
 * 2 columns on mobile, 3+ on desktop
 */
export function MetricGrid({
  children,
  className = '',
  ...props
}) {
  return (
    <GridContainer
      columns={3}
      gap="gap-3 md:gap-4 lg:gap-6"
      className={className}
      {...props}
    >
      {children}
    </GridContainer>
  )
}

/**
 * StackedList - Vertical list with consistent spacing
 */
export function StackedList({
  items,
  renderItem,
  gap = 'gap-2 md:gap-3',
  className = '',
  ...props
}) {
  return (
    <div className={cn('flex flex-col', gap, className)} {...props}>
      {items?.map((item, i) => (
        <div key={item.id || i}>{renderItem(item)}</div>
      ))}
    </div>
  )
}
