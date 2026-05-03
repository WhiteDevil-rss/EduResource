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

        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
              <p className="text-xs text-muted-foreground animate-pulse">Syncing collaboration thread...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((entry) => (
              <div key={entry.id} className="flex gap-3 group animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                  <span className="text-[10px] font-bold uppercase">
                    {(entry.authorName || entry.authorEmail || 'A').charAt(0)}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{entry.authorName || entry.authorEmail || 'Anonymous'}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Recently</p>
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none bg-muted/30 border border-border/10 group-hover:bg-muted/50 transition-colors">
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{entry.body}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center space-y-2 bg-muted/5 rounded-2xl border border-dashed border-border/20">
              <MessageSquare size={24} className="mx-auto text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground font-medium">No discussions yet.</p>
              <p className="text-[10px] text-muted-foreground/60">Be the first to start a conversation about this resource.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
