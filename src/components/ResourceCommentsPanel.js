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
      // No-op
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border border-border/40 bg-card rounded-xl shadow-sm">
      <CardHeader className="p-5 border-b border-border/10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          Collaboration Thread
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">Discuss this resource or ask questions.</CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="flex gap-2">
          <Input 
            value={comment} 
            onChange={(event) => setComment(event.target.value)} 
            placeholder="Add a question or note..." 
            className="h-9 text-xs rounded-lg border-border/40 bg-muted/20"
          />
          <Button 
            type="button" 
            size="sm"
            onClick={handlePostComment} 
            disabled={saving || !comment.trim()}
            className="h-9 px-4 rounded-lg text-xs font-semibold"
          >
            <Plus size={14} className="mr-1.5" />
            Post
          </Button>
        </div>

        <div className="space-y-0 divide-y divide-border/10 overflow-hidden rounded-lg border border-border/10">
          {loading ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground animate-pulse">Retrieving messages...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((entry) => (
              <div key={entry.id} className="p-3 bg-muted/5 transition-colors hover:bg-muted/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-foreground">{entry.authorName || entry.authorEmail || 'Anonymous'}</p>
                  <p className="text-[10px] text-muted-foreground">Just now</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{entry.body}</p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No discussions yet. Be the first to start!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
