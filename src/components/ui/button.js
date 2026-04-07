import { cn } from '@/lib/cn'

const buttonVariants = {
  default: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  outline: 'button-outline',
}

export function Button({ className = '', variant = 'default', asChild = false, children, ...props }) {
  const Component = asChild ? 'span' : 'button'
  return (
    <Component className={cn(buttonVariants[variant] || buttonVariants.default, className)} {...props}>
      {children}
    </Component>
  )
}