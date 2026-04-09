'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SavedSearchPanel() {
  const [savedSearches, setSavedSearches] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadSavedSearches = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/saved-searches', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load saved searches.')
        }
        if (isActive) {
          setSavedSearches(Array.isArray(payload?.savedSearches) ? payload.savedSearches : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          setSavedSearches([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadSavedSearches()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  const handleSaveSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save search.')
      }
      setSavedSearches((current) => [payload.savedSearch, ...current])
      setQuery('')
    } catch {
      // No-op
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSearch = async (searchId) => {
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete saved search.')
      }
      setSavedSearches((current) => current.filter((entry) => entry.id !== searchId))
    } catch {
      // No-op
    }
  }

  return (
    <Card className="border border-border/40 bg-card rounded-xl shadow-sm">
      <CardHeader className="p-5 border-b border-border/10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Search size={16} className="text-primary" />
          Saved Queries
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">Revisit your frequent searches quickly.</CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="E.g. Quantum Physics..."
            className="h-9 text-xs rounded-lg border-border/40 bg-muted/20"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSaveSearch}
            disabled={saving || !query.trim()}
            className="h-9 px-4 rounded-lg text-xs font-semibold"
          >
            <Plus size={14} className="mr-1.5" />
            Save
          </Button>
        </div>

        <div className="space-y-0 divide-y divide-border/10 overflow-hidden rounded-lg border border-border/10">
          {loading ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground animate-pulse">Syncing search history...</p>
            </div>
          ) : savedSearches.length > 0 ? (
            savedSearches.map((entry) => (
              <div key={entry.id} className="p-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted/5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{entry.query}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {entry.subject || 'All Subjects'} {entry.classFilter ? `• ${entry.classFilter}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteSearch(entry.id)}
                    aria-label={`Delete ${entry.query}`}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Your search library is empty.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
