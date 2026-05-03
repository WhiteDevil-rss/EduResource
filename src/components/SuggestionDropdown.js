'use client'

import { useEffect, useRef, useState } from 'react'

export function SuggestionDropdown({
  suggestions = [],
  onSelect,
  isOpen = false,
  onOpenChange,
  searchTerm = '',
  isLoading = false,
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef(null)

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [suggestions])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen || !suggestions.length) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          event.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
          break
        case 'Enter':
          event.preventDefault()
          if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
            onSelect?.(suggestions[highlightedIndex])
          }
          break
        case 'Escape':
          event.preventDefault()
          onOpenChange?.(false)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, suggestions, highlightedIndex, onSelect, onOpenChange])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onOpenChange?.(false)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [onOpenChange])

  if (!isOpen || suggestions.length === 0) {
    return null
  }

  return (
    <div 
      ref={dropdownRef} 
      className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[280px] overflow-auto rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <ul className="space-y-1" role="listbox">
        {isLoading ? (
          <li className="flex items-center justify-center p-8 text-sm text-muted-foreground italic">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <span>Scanning academic cloud...</span>
            </div>
          </li>
        ) : suggestions.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">
            No verified matches found
          </li>
        ) : (
          suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion}-${index}`}
              className={`group flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                highlightedIndex === index 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'text-foreground hover:bg-muted/80'
              }`}
              onClick={() => {
                onSelect?.(suggestion)
                onOpenChange?.(false)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <span className={`block truncate ${highlightedIndex === index ? 'text-primary-foreground' : 'text-foreground'}`}>
                {highlightMatch(suggestion, searchTerm)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = String(text).split(regex)

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-warning/30 font-medium text-foreground">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}
