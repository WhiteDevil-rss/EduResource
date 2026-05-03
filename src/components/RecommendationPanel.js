'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function RecommendationPanel() {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadRecommendations = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/recommendations', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load recommendations.')
        }
        if (isActive) {
          setRecommendations(Array.isArray(payload?.recommendations) ? payload.recommendations : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          setRecommendations([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  return (
    <Card className="border border-border/40 bg-card rounded-xl overflow-hidden shadow-sm">
      <CardHeader className="p-5 border-b border-border/10">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-secondary" />
            Recommended for You
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-secondary/70 border-secondary/20 bg-secondary/5">Smart Feed</Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">Based on your recent activity and saved resources.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border/10">
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-xs text-muted-foreground animate-pulse">Analyzing library patterns...</p>
          </div>
        ) : recommendations.length > 0 ? (
          recommendations.map((entry) => (
            <div key={entry.id} className="p-4 flex items-center justify-between gap-4 transition-colors hover:bg-muted/5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {entry.subject || 'General Resources'} {entry.class ? `• ${entry.class}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] font-medium border-border/40 px-1.5 h-5">
                  {entry.score > 80 ? 'High Match' : 'Suggested'}
                </Badge>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  className="h-8 rounded-lg text-xs font-semibold px-3"
                  onClick={() => window.open(entry.fileUrl, '_blank', 'noopener,noreferrer')}
                >
                  <BookOpen size={12} className="mr-1.5" />
                  View
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
              No recommendations yet. Interact with more resources to personalize your feed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
