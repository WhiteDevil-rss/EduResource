import { cn } from '@/lib/cn'

/**
 * AppIcon - semantic icon wrapper for consistent contrast and interaction states.
 */
export function AppIcon({
  icon: Icon,
  size = 18,
  active = false,
  interactive = false,
  className = '',
  ...props
}) {
  if (!Icon) {
    return null
  }

  return (
    <Icon
      size={size}
      className={cn(
        'ui-icon',
        active && 'ui-icon--active',
        interactive && 'ui-icon--interactive',
        className
      )}
      {...props}
    />
  )
}
