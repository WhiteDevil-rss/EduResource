'use client'

import { Star, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ReviewSystem({
  reviews = [],
  rating,
  setRating,
  comment,
  setComment,
  onSubmit,
  onRespond,
  title = 'Student Feedback',
  description = 'Overall ratings and sentiment from the student body.',
  allowCreate = false,
}) {
  return (
    <Card className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm">
      <CardHeader className="p-5 border-b border-border/10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        {allowCreate ? (
          <div className="space-y-4 rounded-xl border border-border/20 bg-muted/5 p-4">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-0.5">Rating Score</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="rounded-lg p-1.5 transition-colors hover:bg-muted/20"
                    onClick={() => setRating?.(value)}
                    aria-label={`${value} star rating`}
                  >
                    <Star
                      size={20}
                      className={value <= rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-0.5">Detailed Feedback</label>
              <Textarea
                value={comment}
                onChange={(event) => setComment?.(event.target.value)}
                placeholder="Share your thoughts on this resource..."
                className="text-sm rounded-lg border-border/40 bg-muted/10 min-h-[100px]"
              />
            </div>
            <Button
              type="button"
              onClick={onSubmit}
              className="w-full h-10 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90"
            >
              Submit Feedback
            </Button>
          </div>
        ) : null}

        <div className="space-y-3">
          {reviews.length > 0 ? reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-border/10 p-4 space-y-3 bg-muted/5 transition-colors hover:bg-muted/10">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {review.reviewerName || review.reviewerEmail || 'Anonymous Student'}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                    {review.createdAt || 'Recently Updated'}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">
                  <Star size={10} className="fill-current" />
                  <span className="text-[10px] font-bold">{review.rating}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "{review.comment || 'No detailed feedback provided.'}"
              </p>

              {review.response && (
                <div className="mt-2 p-3 rounded-lg bg-primary/5 border-l-2 border-primary/40">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-tight mb-1">Faculty Response</p>
                  <p className="text-xs text-foreground italic">{review.response}</p>
                </div>
              )}

              {onRespond ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRespond(review)}
                  className="h-8 rounded-lg text-[11px] font-semibold mt-1 border-border/40"
                >
                  Post Response
                </Button>
              ) : null}
            </div>
          )) : (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No peer reviews available for this resource.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
