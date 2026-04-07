import { cn } from '@/lib/cn'

const badgeVariants = {
  default: 'ui-badge',
  secondary: 'ui-badge ui-badge--secondary',
  outline: 'ui-badge ui-badge--outline',
}

export function Badge({ className = '', variant = 'default', children, ...props }) {
  return (
    <span className={cn(badgeVariants[variant] || badgeVariants.default, className)} {...props}>
      {children}
    </span>
  )
}