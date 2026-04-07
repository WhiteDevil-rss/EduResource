import { cn } from '@/lib/cn'

export function Progress({ value = 0, className = '', ...props }) {
  const bounded = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={cn('ui-progress', className)} role="progressbar" aria-valuenow={bounded} aria-valuemin={0} aria-valuemax={100} {...props}>
      <div className="ui-progress__bar" style={{ width: `${bounded}%` }} />
    </div>
  )
}