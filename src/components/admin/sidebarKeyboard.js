export function resolveSidebarKeyboardAction({
  key,
  currentIndex,
  totalItems,
  isGroupToggle,
  groupLabel,
  isGroupCollapsed,
}) {
  const lastIndex = Math.max(0, totalItems - 1)

  if (key === 'ArrowDown') {
    return { type: 'focus-index', index: Math.min(lastIndex, currentIndex + 1) }
  }

  if (key === 'ArrowUp') {
    return { type: 'focus-index', index: Math.max(0, currentIndex - 1) }
  }

  if (key === 'Home') {
    return { type: 'focus-index', index: 0 }
  }

  if (key === 'End') {
    return { type: 'focus-index', index: lastIndex }
  }

  if (key === 'ArrowLeft' && isGroupToggle && groupLabel && !isGroupCollapsed) {
    return { type: 'toggle-group', groupLabel }
  }

  if (key === 'ArrowRight' && isGroupToggle && groupLabel) {
    if (isGroupCollapsed) {
      return { type: 'toggle-group', groupLabel }
    }
    return { type: 'focus-first-group-link', groupLabel }
  }

  return { type: 'none' }
}