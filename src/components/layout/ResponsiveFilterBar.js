'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

/**
 * ResponsiveFilterBar - Mobile stacked, desktop inline filters
 * Mobile: Stacked filters with full-width inputs
 * Desktop: Inline filters with consistent spacing
 */
export function ResponsiveFilterBar({
  filters,
  onFilterChange,
  onReset,
  className = '',
  ...props
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm md:p-5',
        'flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end',
        className
      )}
      {...props}
    >
      <div className="flex w-full flex-col gap-3 lg:flex-1 lg:flex-row lg:flex-wrap lg:items-end">
        {filters.map((filter) => (
          <div key={filter.id} className="flex w-full min-w-0 flex-col gap-1.5 lg:w-auto">
            {filter.label && (
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {filter.label}
              </label>
            )}

            {filter.type === 'search' && (
              <Input
                type="text"
                placeholder={filter.placeholder}
                value={filter.value}
                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                className="h-11 rounded-xl text-sm"
                aria-label={filter.label || 'Search'}
              />
            )}

            {filter.type === 'select' && (
              <select
                value={filter.value}
                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                className={cn(
                  'h-11 w-full rounded-xl border border-input bg-background px-3',
                  'text-sm font-medium text-foreground',
                  'transition-colors hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/50',
                )}
                aria-label={filter.label}
              >
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {filter.type === 'multiselect' && (
              <div className="flex flex-wrap gap-2">
                {filter.options?.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const current = Array.isArray(filter.value) ? filter.value : []
                      const updated = current.includes(option.value)
                        ? current.filter((v) => v !== option.value)
                        : [...current, option.value]
                      onFilterChange(filter.id, updated)
                    }}
                    className={cn(
                      'rounded-full px-3 py-2 text-xs font-medium transition-colors',
                      (Array.isArray(filter.value) ? filter.value : []).includes(option.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reset Button */}
      {onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-11 w-full rounded-xl text-xs md:w-auto md:text-sm"
          aria-label="Reset filters"
        >
          <X size={16} />
          Reset
        </Button>
      )}
    </div>
  )
}

/**
 * FilterChip - Individual filter chip for display
 */
export function FilterChip({
  label,
  onRemove,
  className = '',
  variant = 'default',
  ...props
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        className
      )}
      {...props}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${label} filter`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

/**
 * ActiveFiltersDisplay - Show active filters as chips
 */
export function ActiveFiltersDisplay({
  filters,
  onRemoveFilter,
  className = '',
}) {
  const activeFilters = filters.filter((f) => f.value && f.value !== 'all')

  if (activeFilters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs text-muted-foreground font-medium">Active:</span>
      {activeFilters.map((filter) => (
        <FilterChip
          key={filter.id}
          label={`${filter.label}: ${filter.value}`}
          onRemove={() => onRemoveFilter(filter.id)}
        />
      ))}
    </div>
  )
}
