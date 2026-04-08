'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { isAbortError, useCancelableFetch } from '@/hooks/useCancelableFetch'

export function SearchInput({
  value = '',
  onChange,
  onSuggestionsChange,
  placeholder = 'Search...',
  debounceMs = 300,
  type = 'resources',
  disabled = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debouncedQuery = useDebouncedSearch(value, debounceMs)
  const { execute, cancel } = useCancelableFetch()

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      cancel()
      setLoading(false)
      onSuggestionsChange?.([])
      setError('')
      return
    }

    let mounted = true

    const run = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await execute(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=${encodeURIComponent(type)}&limit=5`, {
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not fetch suggestions.')
        }

        if (!mounted) {
          return
        }

        onSuggestionsChange?.(Array.isArray(payload?.suggestions) ? payload.suggestions : [])
      } catch (err) {
        if (!mounted || isAbortError(err)) {
          return
        }

        setError(err.message || 'Could not fetch suggestions.')
        onSuggestionsChange?.([])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [cancel, debouncedQuery, execute, onSuggestionsChange, type])

  return (
    <div className={`search-input-wrapper ${className}`}>
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        aria-label="Search input"
        className="search-input"
      />
      {loading ? <span className="search-input-spinner" title="Loading suggestions..." /> : null}
      {error ? <span className="search-input-error" title={error} /> : null}
    </div>
  )
}
