'use client'

import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  isConfirming = false,
  confirmDisabled = false,
  confirmVariant = 'destructive',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <div className="ui-dialog__content">
        <div className="ui-dialog__header">
          <h3 className="ui-dialog__title">{title}</h3>
          {description ? <p className="ui-dialog__description">{description}</p> : null}
        </div>
        <div className="modal-form__actions" style={{ marginTop: '1rem', gap: '1rem' }}>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
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
