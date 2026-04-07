import { cn } from '@/lib/cn'

const buttonVariants = {
  default: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  outline: 'button-outline',
}

const buttonSizes = {
  default: '',
  sm: 'px-3 py-2 text-sm',
  icon: 'h-10 w-10 p-0',
}

export function Button({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }) {
  const Component = asChild ? 'span' : 'button'
  return (
    <Component
      className={cn(buttonVariants[variant] || buttonVariants.default, buttonSizes[size] || buttonSizes.default, className)}
      {...props}
    >
      {children}
    </Component>
  )
}