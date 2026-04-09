import { cn } from '@/lib/cn'

const buttonVariants = {
  default: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  outline: 'button-outline',
  destructive: 'button-destructive',
}

export function Button({ className = '', variant = 'default', asChild = false, children, ...props }) {
  const Component = asChild ? 'span' : 'button'
  const normalizedProps = !asChild && !props.type
    ? { ...props, type: 'button' }
    : props
  return (
    <Component className={cn(buttonVariants[variant] || buttonVariants.default, className)} {...normalizedProps}>
      {children}
    </Component>
  )
}