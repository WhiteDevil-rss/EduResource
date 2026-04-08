'use client'

import { Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

export function ReviewSystem({
  reviews = [],
  rating,
  setRating,
  comment,
  setComment,
  onSubmit,
  onRespond,
  title = 'Reviews',
  description = 'Ratings and feedback for this resource.',
  allowCreate = false,
}) {
  return (
    <Card className="rounded-xl border border-outline shadow-sm bg-surface-card">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        {allowCreate ? (
          <div className="space-y-3 rounded-lg border border-outline/50 bg-surface-panel/50 p-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="rounded-md p-1"
                  onClick={() => setRating?.(value)}
                  aria-label={`${value} star rating`}
                >
                  <Star size={16} className={value <= rating ? 'text-warning fill-warning' : 'text-muted'} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(event) => setComment?.(event.target.value)} placeholder="Write a short review..." />
            <Button type="button" onClick={onSubmit}>Submit Review</Button>
          </div>
        ) : null}

        <div className="space-y-3">
          {reviews.length > 0 ? reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-outline/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{review.reviewerName || review.reviewerEmail || 'Anonymous'}</p>
                  <p className="text-xs text-muted">{review.createdAt || 'Recently'}</p>
                </div>
                <Badge variant="secondary">{review.rating}/5</Badge>
              </div>
              <p className="text-sm text-muted">{review.comment || 'No comment provided.'}</p>
              {review.response ? <p className="text-sm text-foreground border-l-2 border-primary/40 pl-3">Response: {review.response}</p> : null}
              {onRespond ? (
                <Button type="button" variant="outline" onClick={() => onRespond(review)}>
                  Respond
                </Button>
              ) : null}
            </div>
          )) : (
            <p className="text-sm text-muted">No reviews yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
