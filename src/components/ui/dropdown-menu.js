'use client'

import { cloneElement, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

const DropdownMenuContext = createContext(null)

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!open) {
        return
      }

      if (
        triggerRef.current?.contains(event.target) ||
        contentRef.current?.contains(event.target)
      ) {
        return
      }

      setOpen(false)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const value = useMemo(
    () => ({ open, setOpen, triggerRef, contentRef }),
    [open]
  )

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className="dropdown-menu__root">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({ asChild = false, className = '', children, onClick, ...props }) {
  const context = useContext(DropdownMenuContext)

  if (asChild && children && typeof children === 'object') {
    return cloneElement(children, {
      ref: context?.triggerRef,
      className: cn('dropdown-menu__trigger', children.props?.className, className),
      onClick: (event) => {
        onClick?.(event)
        children.props?.onClick?.(event)
        context?.setOpen((current) => !current)
      },
      'aria-haspopup': 'menu',
      'aria-expanded': context?.open,
      ...props,
    })
  }

  const Component = 'button'

  return (
    <Component
      ref={context?.triggerRef}
      className={cn('dropdown-menu__trigger', className)}
      onClick={(event) => {
        onClick?.(event)
        context?.setOpen((current) => !current)
      }}
      aria-haspopup="menu"
      aria-expanded={context?.open}
      {...props}
    >
      {children}
    </Component>
  )
}

export function DropdownMenuContent({ className = '', align = 'end', children, ...props }) {
  const context = useContext(DropdownMenuContext)
  if (!context?.open) {
    return null
  }

  return (
    <div
      ref={context.contentRef}
      role="menu"
      className={cn('dropdown-menu__content', align === 'end' && 'dropdown-menu__content--end', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ className = '', children, onSelect, ...props }) {
  const context = useContext(DropdownMenuContext)

  return (
    <button
      type="button"
      role="menuitem"
      className={cn('dropdown-menu__item', className)}
      onClick={(event) => {
        onSelect?.(event)
        context?.setOpen(false)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator({ className = '', ...props }) {
  return <div role="separator" className={cn('dropdown-menu__separator', className)} {...props} />
}
