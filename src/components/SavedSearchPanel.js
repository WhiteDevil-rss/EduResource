'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
      // No-op: the dashboard already surfaces failures through the surrounding UI.
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
      // Ignore local errors here; the server state remains authoritative.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Searches you want to revisit</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Search size={18} />
          Saved Searches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="student-support-card" style={{ gap: 12 }}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Save a search query" />
          <Button type="button" onClick={handleSaveSearch} disabled={saving || !query.trim()}>
            <Plus size={14} />
            Save
          </Button>
        </div>

        {loading ? (
          <p>Loading saved searches...</p>
        ) : savedSearches.length > 0 ? (
          savedSearches.map((entry) => (
            <div key={entry.id} className="student-download-item">
              <div>
                <strong>{entry.query}</strong>
                <p>{entry.subject || 'Any subject'} {entry.classFilter ? `• ${entry.classFilter}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={entry.alertsEnabled ? 'secondary' : 'outline'}>{entry.alertsEnabled ? 'Alerts on' : 'Alerts off'}</Badge>
                <Button type="button" variant="outline" onClick={() => handleDeleteSearch(entry.id)} aria-label={`Delete ${entry.query}`}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p>No saved searches yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
