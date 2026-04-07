import { cn } from '@/lib/cn'

export function Skeleton({ className = '', ...props }) {
  return <div className={cn('ui-skeleton', className)} aria-hidden="true" {...props} />
}