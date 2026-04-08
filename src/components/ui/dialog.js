'use client'

import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

function DialogShell({ open, onOpenChange, children, className = '', labelledBy }) {
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  const moveFocusIntoDialog = () => {
    const node = dialogRef.current
    if (!node) return

    const focusable = node.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusable.length > 0) {
      focusable[0].focus()
      return
    }

    node.focus()
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    previousFocusRef.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(moveFocusIntoDialog, 0)

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    const handleTabTrap = (event) => {
      if (event.key !== 'Tab') {
        return
      }

      const node = dialogRef.current
      if (!node) {
        return
      }

      const focusable = Array.from(
        node.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )

      if (focusable.length === 0) {
        event.preventDefault()
        node.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleTabTrap)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleTabTrap)

      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [open, onOpenChange])

  if (!open || !mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="ui-dialog__backdrop" onClick={() => onOpenChange(false)}>
      <div
        ref={dialogRef}
        className={`ui-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
        <button type="button" className="ui-dialog__close" aria-label="Close dialog" onClick={() => onOpenChange(false)}>
          <X size={18} />
        </button>
      </div>
    </div>,
    document.body
  )
}

export function Dialog({ open, onOpenChange, children, className = '', labelledBy }) {
  return <DialogShell open={open} onOpenChange={onOpenChange} className={className} labelledBy={labelledBy}>{children}</DialogShell>
}

export function DialogHeader({ className = '', children, ...props }) {
  return <div className={`ui-dialog__header ${className}`.trim()} {...props}>{children}</div>
}

export function DialogTitle({ className = '', children, ...props }) {
  return <h3 className={`ui-dialog__title ${className}`.trim()} {...props}>{children}</h3>
}

export function DialogDescription({ className = '', children, ...props }) {
  return <p className={`ui-dialog__description ${className}`.trim()} {...props}>{children}</p>
}

export function DialogBody({ className = '', children, ...props }) {
  return <div className={`ui-dialog__body ${className}`.trim()} {...props}>{children}</div>
}

export function DialogFooter({ className = '', children, ...props }) {
  return <div className={`ui-dialog__footer ${className}`.trim()} {...props}>{children}</div>
}