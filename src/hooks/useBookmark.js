'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

export function useBookmark() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks])

  const loadBookmarks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bookmark/list', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load bookmarks.')
      }

      const resources = Array.isArray(payload?.resources) ? payload.resources : []
      setBookmarks(resources.map((entry) => String(entry.id || '').trim()).filter(Boolean))
    } catch (error) {
      toast.error(error.message || 'Could not load bookmarks.')
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleBookmark = useCallback(async (resourceId) => {
    const id = String(resourceId || '').trim()
    if (!id || saving) return { bookmarked: false }

    setSaving(true)
    try {
      const response = await fetch('/api/bookmark/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update bookmark.')
      }

      const nextBookmarks = Array.isArray(payload?.bookmarks) ? payload.bookmarks : []
      setBookmarks(nextBookmarks)

      toast.success(payload?.bookmarked ? 'Saved to favorites.' : 'Removed from favorites.')
      return { bookmarked: Boolean(payload?.bookmarked) }
    } catch (error) {
      toast.error(error.message || 'Could not update bookmark.')
      return { bookmarked: bookmarkSet.has(id) }
    } finally {
      setSaving(false)
    }
  }, [bookmarkSet, saving])

  useEffect(() => {
    loadBookmarks()
  }, [loadBookmarks])

  const isBookmarked = useCallback((resourceId) => bookmarkSet.has(String(resourceId || '').trim()), [bookmarkSet])

  return {
    bookmarks,
    loading,
    saving,
    isBookmarked,
    toggleBookmark,
    refreshBookmarks: loadBookmarks,
  }
}
