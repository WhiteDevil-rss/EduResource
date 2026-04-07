'use client'

/**
 * SelectableRow Component
 * Table row with checkbox for bulk selection
 * Used in user management and resources tables
 */
export function SelectableRow({
  id,
  isSelected,
  onToggle,
  children,
  className = '',
}) {
  return (
    <tr
      className={`selectable-item ${isSelected ? 'selectable-item--selected' : ''} ${className}`}
      data-id={id}
    >
      <td className="table-cell-checkbox">
        <label className="selectable-item__checkbox">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onToggle?.(id)}
            aria-label={`Select item ${id}`}
          />
        </label>
      </td>
      {children}
    </tr>
  )
}
