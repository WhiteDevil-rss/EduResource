export function resolveSidebarKeyboardAction({
  key,
  currentIndex,
  totalItems,
  isGroupToggle,
  groupLabel,
  isGroupCollapsed,
}) {
  if (key === 'ArrowDown') {
    return { type: 'focus-index', index: Math.min(totalItems - 1, currentIndex + 1) }
  }

  if (key === 'ArrowUp') {
    return { type: 'focus-index', index: Math.max(0, currentIndex - 1) }
  }

  if (key === 'Home') {
    return { type: 'focus-index', index: 0 }
  }

  if (key === 'End') {
    return { type: 'focus-index', index: Math.max(0, totalItems - 1) }
  }

  if (isGroupToggle && groupLabel && key === 'ArrowLeft' && !isGroupCollapsed) {
    return { type: 'toggle-group', groupLabel }
  }

  if (isGroupToggle && groupLabel && key === 'ArrowRight') {
    if (isGroupCollapsed) {
      return { type: 'toggle-group', groupLabel }
    }

    return { type: 'focus-first-group-link', groupLabel }
  }

  return { type: 'none' }
}
