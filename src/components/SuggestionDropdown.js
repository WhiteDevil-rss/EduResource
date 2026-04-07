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
    <div ref={dropdownRef} className="suggestion-dropdown">
      <ul className="suggestion-dropdown__list" role="listbox">
        {isLoading ? (
          <li className="suggestion-dropdown__item suggestion-dropdown__item--loading">
            <span>Loading suggestions...</span>
          </li>
        ) : suggestions.length === 0 ? (
          <li className="suggestion-dropdown__item suggestion-dropdown__item--empty">
            <span>No suggestions found</span>
          </li>
        ) : (
          suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion}-${index}`}
              className={`suggestion-dropdown__item ${highlightedIndex === index ? 'suggestion-dropdown__item--highlighted' : ''}`}
              onClick={() => {
                onSelect?.(suggestion)
                onOpenChange?.(false)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <span className="suggestion-dropdown__text">
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
          <mark key={index} style={{ backgroundColor: 'rgba(255, 193, 7, 0.3)', fontWeight: 500 }}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}
