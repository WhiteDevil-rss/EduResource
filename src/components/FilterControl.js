'use client'

import { Input } from '@/components/ui/input'

export function FilterControl({
  label,
  value = '',
  onChange,
  options = [],
  type = 'select',
  placeholder = 'Filter...',
  disabled = false,
  className = '',
}) {
  if (type === 'text') {
    return (
      <label className={`filter-control ${className}`}>
        <span className="filter-control__label">{label}</span>
        <Input
          type="text"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </label>
    )
  }

  return (
    <label className={`filter-control ${className}`}>
      <span className="filter-control__label">{label}</span>
      <select
        className="ui-input"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
