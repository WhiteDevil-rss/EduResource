'use client'

import { Dialog } from '@/components/ui/dialog'

export function AlertDialog({ open, onOpenChange, children, labelledBy, className = '' }) {
  return <Dialog open={open} onOpenChange={onOpenChange} labelledBy={labelledBy} className={`ui-alert-dialog ${className}`.trim()}>{children}</Dialog>
}