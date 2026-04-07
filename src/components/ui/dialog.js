'use client'

import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

function DialogShell({ open, onOpenChange, children, className = '', labelledBy }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange])

  if (!open || !mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="ui-dialog__backdrop" onClick={() => onOpenChange(false)}>
      <div className={`ui-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(event) => event.stopPropagation()}>
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