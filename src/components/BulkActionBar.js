'use client'

import { useState } from 'react'
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, Download, X } from 'lucide-react'

/**
 * BulkActionBar Component
 * Displays when items are selected, with delete and export actions
 * Sticky positioning and mobile-friendly design
 */
export function BulkActionBar({
  selectedCount = 0,
  onDelete = async () => {},
  onExport = async () => {},
  onClear = () => {},
  isLoading = false,
  itemType = 'items', // "users", "resources", etc.
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete()
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <>
      <div className="bulk-action-bar">
        <div className="bulk-action-bar__inner">
          {/* Left section: info and count */}
          <div className="bulk-action-bar__info">
            <span className="bulk-action-bar__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12Z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className="bulk-action-bar__text">
              <strong>{selectedCount}</strong> {itemType} selected
            </span>
          </div>

          {/* Right section: action buttons */}
          <div className="bulk-action-bar__actions">
            <button
              className="bulk-action-bar__btn bulk-action-bar__btn--export"
              onClick={handleExport}
              disabled={isExporting || isDeleting || isLoading}
              title="Export selected items"
            >
              <Download size={18} />
              <span className="bulk-action-bar__btn-text">Export</span>
            </button>

            <button
              className="bulk-action-bar__btn bulk-action-bar__btn--delete"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || isExporting || isLoading}
              title="Delete selected items"
            >
              <Trash2 size={18} />
              <span className="bulk-action-bar__btn-text">Delete</span>
            </button>

            <button
              className="bulk-action-bar__btn bulk-action-bar__btn--clear"
              onClick={onClear}
              disabled={isDeleting || isExporting || isLoading}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X size={18} />
              <span className="bulk-action-bar__btn-text sr-only">Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} labelledBy="bulk-action-delete-title">
        <DialogBody>
          <DialogHeader>
            <DialogTitle id="bulk-action-delete-title">Delete {selectedCount} {itemType}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected {itemType} will be permanently deleted along with all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <button type="button" className="button-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="button-destructive"
            >
              {isDeleting ? (
                <>
                  <svg className="inline-block animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
