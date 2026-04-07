'use client'

import { cloneElement, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

export function DropdownMenuContent({ className = '', align = 'end', sideOffset = 4, children, ...props }) {
  const context = useContext(DropdownMenuContext)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!context?.open || !context?.triggerRef.current) {
      return
    }

    const updatePosition = () => {
      const triggerRect = context.triggerRef.current?.getBoundingClientRect()
      const contentEl = context.contentRef.current

      if (!triggerRect || !contentEl) {
        return
      }

      const contentWidth = contentEl.offsetWidth
      const contentHeight = contentEl.offsetHeight
      const viewportPadding = 8

      let nextLeft = triggerRect.left
      if (align === 'end') {
        nextLeft = triggerRect.right - contentWidth
      }

      const maxLeft = window.innerWidth - contentWidth - viewportPadding
      nextLeft = Math.max(viewportPadding, Math.min(nextLeft, maxLeft))

      const preferredTop = triggerRect.bottom + sideOffset
      const fitsBelow = preferredTop + contentHeight <= window.innerHeight - viewportPadding
      const aboveTop = triggerRect.top - sideOffset - contentHeight
      const nextTop = fitsBelow
        ? preferredTop
        : Math.max(viewportPadding, aboveTop)

      setPosition({ top: nextTop, left: nextLeft })
    }

    const frame = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, context?.open, context?.triggerRef, context?.contentRef, sideOffset])

  if (!context?.open) {
    return null
  }

  if (!mounted) {
    return null
  }

  return createPortal(
    <div
      ref={context.contentRef}
      role="menu"
      className={cn('dropdown-menu__content', align === 'end' && 'dropdown-menu__content--end', className)}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      {...props}
    >
      {children}
    </div>,
    document.body
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
