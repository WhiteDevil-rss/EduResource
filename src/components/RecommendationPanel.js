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
    <Card>
      <CardHeader>
        <CardDescription>Personalized for your account</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={18} />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p>Loading recommendations...</p>
        ) : recommendations.length > 0 ? (
          recommendations.map((entry) => (
            <div key={entry.id} className="student-download-item">
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.subject || 'General'} {entry.class ? `• ${entry.class}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Score {entry.score ?? 0}</Badge>
                <Button type="button" variant="secondary" onClick={() => window.open(entry.fileUrl, '_blank', 'noopener,noreferrer')}>
                  <BookOpen size={14} />
                  Open
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p>No recommendations yet. Open more resources to improve results.</p>
        )}
      </CardContent>
    </Card>
  )
}
