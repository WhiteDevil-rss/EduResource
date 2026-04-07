'use client'

/**
 * SelectableCard Component
 * Card wrapper with checkbox for bulk selection
 * Used in resource grids and user profile cards
 */
export function SelectableCard({
  id,
  isSelected,
  onToggle,
  children,
  className = '',
}) {
  return (
    <div
      className={`selectable-card ${isSelected ? 'selectable-item--selected' : ''} ${className}`}
      data-id={id}
    >
      <label className="selectable-item__checkbox selectable-card__checkbox">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={() => onToggle?.(id)}
          aria-label={`Select item ${id}`}
        />
      </label>
      {children}
    </div>
  )
}

/**
 * Wrapper to make existing card components selectable
 * Pass existing card as children
 */
export function withSelectableCard(CardComponent) {
  return function SelectableCardWrapper({
    id,
    isSelected,
    onToggle,
    ...props
  }) {
    return (
      <div
        className={`selectable-card-wrapper ${isSelected ? 'selectable-item--selected' : ''}`}
        data-id={id}
      >
        <label className="selectable-item__checkbox selectable-card__checkbox--overlay">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onToggle?.(id)}
            aria-label={`Select item ${id}`}
          />
        </label>
        <CardComponent {...props} />
      </div>
    )
  }
}
