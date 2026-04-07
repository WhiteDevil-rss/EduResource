'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

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
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!value.trim()) {
      onSuggestionsChange?.([])
      setError('')
      return
    }

    setLoading(true)
    setError('')

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}&type=${encodeURIComponent(type)}&limit=5`, {
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not fetch suggestions.')
        }

        onSuggestionsChange?.(Array.isArray(payload?.suggestions) ? payload.suggestions : [])
      } catch (err) {
        setError(err.message || 'Could not fetch suggestions.')
        onSuggestionsChange?.([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, debounceMs, type, onSuggestionsChange])

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
