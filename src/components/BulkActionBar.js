'use client'

import { useState } from 'react'
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2, Download, X, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  itemType = 'items',
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
      <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/90 p-4 text-primary-foreground shadow-2xl backdrop-blur-xl md:px-6">
          {/* Left section: info and count */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div className="hidden flex-col sm:flex">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Selection active</p>
                <p className="text-sm font-bold">
                    {selectedCount} {itemType} selected
                </p>
            </div>
            <div className="flex flex-col sm:hidden">
                <p className="text-sm font-bold">
                    {selectedCount} sel.
                </p>
            </div>
          </div>

          {/* Right section: action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-10 rounded-xl bg-white/10 px-4 font-bold text-white hover:bg-white/20 border-transparent transition-all"
              onClick={handleExport}
              disabled={isExporting || isDeleting || isLoading}
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="mr-2" />}
              <span className="hidden md:inline">Export</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="h-10 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 shadow-sm border-transparent transition-all"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || isExporting || isLoading}
            >
              <Trash2 size={16} className="mr-2" />
              <span className="hidden md:inline">Delete</span>
            </Button>

            <div className="mx-1 h-6 w-px bg-white/20" />

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
              onClick={onClear}
              disabled={isDeleting || isExporting || isLoading}
              aria-label="Clear selection"
            >
              <X size={20} />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} {itemType}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected {itemType} will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
              Confirm Delete
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}
