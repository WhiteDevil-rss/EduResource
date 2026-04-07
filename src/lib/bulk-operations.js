'use client'

import toast from 'react-hot-toast'

/**
 * Utility functions for bulk operations (delete, export)
 */

/**
 * Perform bulk delete operation
 */
export async function performBulkDelete(selectedIds, itemType) {
  if (!selectedIds.length) {
    toast.error('No items selected for deletion')
    return { success: false }
  }

  try {
    const response = await fetch('/api/bulk/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: selectedIds,
        type: itemType,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      toast.error(data.error || 'Failed to delete items')
      return { success: false, error: data.error }
    }

    if (data.results.deleted.length > 0) {
      toast.success(
        `Successfully deleted ${data.results.deleted.length} item(s)`
      )
    }

    if (data.results.failed.length > 0) {
      toast.warning(
        `Failed to delete ${data.results.failed.length} item(s): ${data.results.failed.map((f) => f.reason).join(', ')}`
      )
    }

    if (data.results.skipped.length > 0) {
      toast.info(
        `Skipped ${data.results.skipped.length} protected item(s)`
      )
    }

    return {
      success: data.results.deleted.length > 0,
      ...data.results,
    }
  } catch (error) {
    console.error('Bulk delete error:', error)
    toast.error('Network error during deletion')
    return { success: false, error: error.message }
  }
}

/**
 * Perform bulk export operation
 */
export async function performBulkExport(selectedIds, itemType) {
  if (!selectedIds.length) {
    toast.error('No items selected for export')
    return { success: false }
  }

  try {
    const response = await fetch('/api/bulk/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: selectedIds,
        type: itemType,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || 'Failed to export items')
      return { success: false, error: error.error }
    }

    // Get filename from response header or generate one
    const contentDisposition = response.headers.get(
      'content-disposition'
    )
    const filename =
      contentDisposition
        ?.split('filename="')?.[1]
        ?.replace('"', '') ||
      `${itemType}-export-${new Date().toISOString().split('T')[0]}.csv`

    // Create blob and download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success(`Exported ${selectedIds.length} item(s)`)
    return { success: true, filename }
  } catch (error) {
    console.error('Bulk export error:', error)
    toast.error('Network error during export')
    return { success: false, error: error.message }
  }
}

/**
 * Format item counts for display
 */
export function formatItemCount(count, singular, plural) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`
}

/**
 * Check if any selected items are protected
 */
export function hasProtectedItems(items, selectedIds, protectedCheck) {
  return selectedIds.some((id) => {
    const item = items.find((i) => i.id === id)
    return protectedCheck?.(item)
  })
}
