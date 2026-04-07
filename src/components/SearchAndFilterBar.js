'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterControl } from '@/components/FilterControl'
import { SearchInput } from '@/components/SearchInput'
import { SuggestionDropdown } from '@/components/SuggestionDropdown'

export function SearchAndFilterBar({
  searchValue = '',
  onSearchChange,
  filters = [],
  onFilterChange,
  sortValue = 'newest',
  onSortChange,
  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'a-z', label: 'A – Z' },
    { value: 'z-a', label: 'Z – A' },
    { value: 'most-downloaded', label: 'Most Downloaded' },
  ],
  onReset,
  searchType = 'resources',
  disabled = false,
  className = '',
}) {
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)

  const handleSearchChange = (value) => {
    onSearchChange?.(value)
    setSuggestionsOpen(value.trim().length > 0)
  }

  const handleSuggestionSelect = (suggestion) => {
    onSearchChange?.(suggestion)
    setSuggestionsOpen(false)
  }

  const handleReset = () => {
    onSearchChange?.('')
    filters.forEach((filter) => {
      onFilterChange?.(filter.id, '')
    })
    onSortChange?.('newest')
    setSuggestionsOpen(false)
    onReset?.()
  }

  return (
    <div className={`search-filter-bar ${className}`}>
      <div className="search-filter-bar__container">
        <div className="search-filter-bar__search-section">
          <div className="search-filter-bar__search-wrapper">
            <SearchInput
              value={searchValue}
              onChange={handleSearchChange}
              onSuggestionsChange={setSuggestions}
              placeholder="Search..."
              type={searchType}
              disabled={disabled}
            />
            <SuggestionDropdown
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              isOpen={suggestionsOpen}
              onOpenChange={setSuggestionsOpen}
              searchTerm={searchValue}
            />
          </div>
        </div>

        <div className="search-filter-bar__filters-section">
          {filters.map((filter) => (
            <FilterControl
              key={filter.id}
              label={filter.label}
              value={filter.value}
              onChange={(value) => onFilterChange?.(filter.id, value)}
              options={filter.options || []}
              type={filter.type || 'select'}
              placeholder={filter.placeholder || 'All'}
              disabled={disabled}
            />
          ))}

          {sortOptions.length > 0 ? (
            <FilterControl
              label="Sort"
              value={sortValue}
              onChange={onSortChange}
              options={sortOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              type="select"
              placeholder="Sort by"
              disabled={disabled}
            />
          ) : null}
        </div>

        <div className="search-filter-bar__actions">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={disabled}
            aria-label="Reset search and filters"
            title="Reset search and filters"
          >
            <RotateCcw size={14} />
            <span className="hidden-mobile">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
