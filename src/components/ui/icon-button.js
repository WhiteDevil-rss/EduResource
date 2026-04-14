import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export function IconButton({
  icon: Icon,
  label,
  className = '',
  variant = 'secondary',
  badge,
  ...props
}) {
  return (
    <Button
      variant={variant}
      className={cn(
        'relative size-11 rounded-xl px-0 text-muted-foreground hover:text-foreground',
        className
      )}
      aria-label={label}
      title={label}
      {...props}
    >
      {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      {badge ? (
        <span className="absolute right-2 top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-danger-foreground">
          {badge}
        </span>
      ) : null}
    </Button>
  )
}
