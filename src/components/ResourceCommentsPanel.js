'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ResourceCommentsPanel({ resourceId }) {
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!resourceId) {
      setComments([])
      return
    }

    const controller = new globalThis.AbortController()
    let isActive = true

    const loadComments = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/resources/${resourceId}/comments`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load comments.')
        }
        if (isActive) {
          setComments(Array.isArray(payload?.comments) ? payload.comments : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          setComments([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadComments()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [resourceId])

  const handlePostComment = async () => {
    const trimmed = comment.trim()
    if (!resourceId || !trimmed) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/resources/${resourceId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not create comment.')
      }
      setComments((current) => [payload.comment, ...current])
      setComment('')
    } catch {
      // Keep the component quiet on failure; the caller can retry.
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Threaded notes and Q&A</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare size={18} />
          Collaboration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="student-support-card" style={{ gap: 12 }}>
          <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a question or note" />
          <Button type="button" onClick={handlePostComment} disabled={saving || !comment.trim()}>
            <Plus size={14} />
            Post
          </Button>
        </div>
        {loading ? (
          <p>Loading collaboration thread...</p>
        ) : comments.length > 0 ? (
          comments.map((entry) => (
            <div key={entry.id} className="student-download-item">
              <div>
                <strong>{entry.authorName || entry.authorEmail || 'Anonymous'}</strong>
                <p>{entry.body}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No comments yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
