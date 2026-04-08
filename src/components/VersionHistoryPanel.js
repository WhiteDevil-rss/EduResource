'use client'

import { useEffect, useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function VersionHistoryPanel({ resourceId }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [rollingBackId, setRollingBackId] = useState(null)

  useEffect(() => {
    if (!resourceId) {
      setVersions([])
      return
    }

    const controller = new globalThis.AbortController()
    let isActive = true

    const loadVersions = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/resources/${resourceId}/versions`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load version history.')
        }
        if (isActive) {
          setVersions(Array.isArray(payload?.versions) ? payload.versions : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          setVersions([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadVersions()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [resourceId])

  const handleRollback = async (versionId) => {
    if (!resourceId) {
      return
    }

    setRollingBackId(versionId)
    try {
      const response = await fetch(`/api/resources/${resourceId}/versions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', versionId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not roll back version.')
      }

      const refreshResponse = await fetch(`/api/resources/${resourceId}/versions`, { cache: 'no-store' })
      const refreshPayload = await refreshResponse.json().catch(() => ({}))
      if (refreshResponse.ok) {
        setVersions(Array.isArray(refreshPayload?.versions) ? refreshPayload.versions : [])
      }
    } catch {
      // Silent failure keeps the panel lightweight; the server state remains unchanged.
    } finally {
      setRollingBackId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Automatic snapshots and manual notes</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <History size={18} />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p>Loading versions...</p>
        ) : versions.length > 0 ? (
          versions.map((version) => (
            <div key={version.id} className="student-download-item">
              <div>
                <strong>{version.title || 'Untitled version'}</strong>
                <p>{version.note || version.updatedAt || 'No timestamp'}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => handleRollback(version.id)} disabled={rollingBackId === version.id}>
                <RotateCcw size={14} />
                {rollingBackId === version.id ? 'Rolling back...' : 'Rollback'}
              </Button>
            </div>
          ))
        ) : (
          <p>No version history yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
