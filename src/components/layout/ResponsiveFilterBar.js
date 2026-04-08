'use client'

import { X, Filter, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

/**
 * ResponsiveFilterBar - The primary search and discovery interface
 * Features: Adaptive layout (stacked on mobile, inline on desktop), consistent touch targets.
 */
export function ResponsiveFilterBar({
  filters,
  onFilterChange,
  onReset,
  className = '',
  maxWidth = 'max-w-[1400px]',
  ...props
}) {
  return (
    <div
      className={cn(
        'w-full flex flex-col gap-4',
        className
      )}
      {...props}
    >
      <div className={cn(
        'relative overflow-hidden rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md md:p-5',
        'flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'
      )}>
        {/* Main Filters Section */}
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          {filters.map((filter) => (
            <div key={filter.id} className="flex w-full flex-col gap-1.5 md:min-w-[200px] lg:w-auto">
              {filter.label && (
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-strong px-1">
                  {filter.label}
                </label>
              )}

              {filter.type === 'search' && (
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={filter.placeholder}
                    value={filter.value}
                    onChange={(e) => onFilterChange(filter.id, e.target.value)}
                    className="h-11 rounded-lg bg-background/50 border-border/40 transition-all focus:bg-background focus:ring-1 focus:ring-primary/40 text-sm font-medium"
                    aria-label={filter.label || 'Search'}
                  />
                </div>
              )}

              {filter.type === 'select' && (
                <div className="relative group">
                  <select
                    value={filter.value}
                    onChange={(e) => onFilterChange(filter.id, e.target.value)}
                    className={cn(
                      'h-11 w-full appearance-none rounded-lg border border-border/40 bg-background/50 px-4 pr-10',
                      'text-sm font-medium text-foreground transition-all',
                      'hover:bg-background hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/40',
                    )}
                    aria-label={filter.label}
                  >
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Filter size={14} className="text-muted-foreground/60" />
                  </div>
                </div>
              )}

              {filter.type === 'multiselect' && (
                <div className="flex flex-wrap gap-2">
                  {filter.options?.map((option) => {
                    const isSelected = (Array.isArray(filter.value) ? filter.value : []).includes(option.value)
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          const current = Array.isArray(filter.value) ? filter.value : []
                          const updated = isSelected
                            ? current.filter((v) => v !== option.value)
                            : [...current, option.value]
                          onFilterChange(filter.id, updated)
                        }}
                        className={cn(
                          'rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95',
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50'
                            : 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/60 hover:text-foreground'
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Global Action Section */}
        {onReset && (
          <div className="flex shrink-0 pt-2 lg:pt-0">
            <Button
              variant="ghost"
              onClick={onReset}
              className="h-11 w-full gap-2 rounded-lg text-xs font-semibold text-muted-strong hover:bg-destructive/5 hover:text-destructive transition-all md:w-auto md:px-4"
              aria-label="Reset filters"
            >
              <RotateCcw size={14} />
              Reset All
            </Button>
          </div>
        )}
      </div>

      {/* Active Chips Area */}
      <ActiveFiltersDisplay 
        filters={filters} 
        onRemoveFilter={onFilterChange} 
      />
    </div>
  )
}

/**
 * FilterChip - High-visibility filter indicator
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
        'group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 animate-in fade-in zoom-in-95',
        variant === 'default' && 'bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10',
        variant === 'muted' && 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/60',
        className
      )}
      {...props}
    >
      <span className="opacity-60">Filter:</span>
      <span className="text-foreground font-semibold">{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 flex h-4 w-4 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground transition-all hover:bg-destructive hover:text-white"
          aria-label={`Remove ${label} filter`}
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

/**
 * ActiveFiltersDisplay - Container for all active chips
 */
export function ActiveFiltersDisplay({
  filters,
  onRemoveFilter,
  className = '',
}) {
  const activeFilters = filters.filter((f) => 
    f.value && 
    f.value !== 'all' && 
    (Array.isArray(f.value) ? f.value.length > 0 : true)
  )

  if (activeFilters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-3 px-1', className)}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-strong mr-1">
        <Filter size={12} />
        <span>Active</span>
      </div>
      {activeFilters.map((filter) => {
        const displayValue = Array.isArray(filter.value) 
          ? `${filter.value.length} selected` 
          : filter.value

        return (
          <FilterChip
            key={filter.id}
            label={`${filter.label}: ${displayValue}`}
            onRemove={() => onRemoveFilter(filter.id, Array.isArray(filter.value) ? [] : 'all')}
          />
        )
      })}
    </div>
  )
}
