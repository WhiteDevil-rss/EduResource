'use client'

import { useState, useCallback } from 'react'

/**
 * Custom hook for managing bulk selection state
 * Handles selecting/deselecting individual items and "select all" functionality
 *
 * @param {Array} items - The full list of items available for selection
 * @returns {Object} Selection state and handlers
 */
export function useBulkSelection(items = []) {
  const [selectedIds, setSelectedIds] = useState(new Set())

  /**
   * Toggle selection of a single item
   */
  const toggleItem = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /**
   * Select all items
   */
  const selectAll = useCallback(() => {
    const allIds = new Set(items.map((item) => item.id))
    setSelectedIds(allIds)
  }, [items])

  /**
   * Deselect all items
   */
  const clearAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /**
   * Toggle between select all and clear all
   */
  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      clearAll()
    } else {
      selectAll()
    }
  }, [selectedIds, items, selectAll, clearAll])

  /**
   * Set selected items explicitly
   */
  const setSelected = useCallback((ids) => {
    setSelectedIds(new Set(ids))
  }, [])

  /**
   * Deselect specific items
   */
  const deselectItems = useCallback((idsToRemove) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      idsToRemove.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  /**
   * Check if item is selected
   */
  const isSelected = useCallback(
    (id) => selectedIds.has(id),
    [selectedIds]
  )

  /**
   * Get array of selected IDs
   */
  const getSelectedArray = useCallback(() => Array.from(selectedIds), [selectedIds])

  /**
   * Check if all items are selected
   */
  const isAllSelected = selectedIds.size === items.length && items.length > 0

  /**
   * Check if some items are selected (but not all)
   */
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length

  /**
   * Check if any items are selected
   */
  const hasSelection = selectedIds.size > 0

  return {
    // State
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isSomeSelected,
    hasSelection,

    // Actions
    toggleItem,
    selectAll,
    clearAll,
    toggleAll,
    setSelected,
    deselectItems,
    isSelected,
    getSelectedArray,
  }
}
