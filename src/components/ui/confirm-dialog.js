'use client'

import { AlertTriangle } from 'lucide-react'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  open,
  onOpenChange = () => {},
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm = () => {},
  isConfirming = false,
  confirmDisabled = false,
  confirmVariant = 'destructive',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <div className="ui-dialog__content">
        <div className="ui-dialog__header pb-3">
          <div className="flex items-start gap-4 rounded-3xl border border-border/60 bg-muted/30 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="ui-dialog__title text-xl sm:text-2xl">{title}</h3>
              {description ? <div className="ui-dialog__description text-sm sm:text-[0.95rem]">{description}</div> : null}
            </div>
          </div>
        </div>
        <div className="ui-dialog__footer flex-col-reverse sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto sm:min-w-28" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            className="w-full sm:w-auto sm:min-w-32"
            disabled={isConfirming || confirmDisabled}
            onClick={onConfirm}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </AlertDialog>
  )
}
