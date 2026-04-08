'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { AdminPageWrapper, SectionCard } from '@/components/admin/AdminPageWrapper'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import toast from 'react-hot-toast'

export default function AdminModerationPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedReview, setSelectedReview] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState('publish')

  useEffect(() => {
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/moderation', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load moderation data.')
        }

        if (isActive) {
          setReviews(Array.isArray(payload?.reviews) ? payload.reviews : [])
          setError('')
        }
      } catch (loadError) {
        if (loadError.name === 'AbortError') return
        if (isActive) {
          setError(loadError.message || 'Could not load moderation data.')
          setReviews([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  const handleModerateReview = async () => {
    if (!actionTarget?.id) {
      return
    }

    try {
      const response = await fetch(`/api/admin/moderation/reviews/${actionTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not moderate review.')
      }

      toast.success(`Review ${actionType === 'publish' ? 'published' : 'hidden'}.`)
      setReviews((current) =>
        current.map((review) => (review.id === actionTarget.id ? payload.review : review))
      )
      setActionTarget(null)
      setSelectedReview(null)
    } catch (loadError) {
      toast.error(loadError.message || 'Could not moderate review.')
    }
  }

  const handleOpenModeration = useCallback((review) => {
    setSelectedReview(review)
    setActionTarget(review)
    setActionType('publish')
  }, [])

  const pendingReviews = useMemo(
    () => reviews.filter((r) => r.status !== 'published' && r.status !== 'hidden'),
    [reviews]
  )
  const publishedReviews = useMemo(
    () => reviews.filter((r) => r.status === 'published'),
    [reviews]
  )
  const flaggedReviews = useMemo(
    () => reviews.filter((r) => r.status === 'hidden'),
    [reviews]
  )

  return (
    <AdminPageWrapper
      title="Content Moderation"
      description="Review and moderate student feedback, collaboration notes, and flagged content."
    >
      <SkeletonWrapper name="admin-moderation" loading={loading}>
        {error ? (
          <SectionCard>
            <div className="student-inline-message student-inline-message--error p-4" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="p-4">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl">{pendingReviews.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardDescription>Published</CardDescription>
              <CardTitle className="text-2xl">{publishedReviews.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardDescription>Flagged / Hidden</CardDescription>
              <CardTitle className="text-2xl">{flaggedReviews.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <SectionCard>
          <CardHeader className="p-4">
            <CardTitle>Review Moderation Queue</CardTitle>
            <CardDescription>All reviews across the platform. Publish or hide based on content policy.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted">No reviews to moderate.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-outline/50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-foreground">{review.reviewerName || review.reviewerEmail || 'Anonymous'}</strong>
                        <Badge variant="secondary">{review.rating}/5</Badge>
                        <Badge variant={review.status === 'published' ? 'secondary' : review.status === 'hidden' ? 'outline' : 'default'}>
                          {review.status || 'pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted mt-1">{review.comment || 'No comment provided.'}</p>
                      <p className="text-xs text-muted-strong mt-2">Resource: {review.resourceTitle || review.resourceId}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModeration(review)}
                      aria-label={`Moderate ${review.reviewerName || 'review'}`}
                    >
                      <Eye size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </SectionCard>
      </SkeletonWrapper>

      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)} labelledBy="moderation-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="moderation-title">Review Moderation</DialogTitle>
          <DialogDescription>
            Approve or hide this review based on your content policy.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {selectedReview && (
            <div className="space-y-3">
              <div className="rounded-lg bg-surface-panel/50 border border-outline p-4 space-y-2">
                <div>
                  <p className="text-xs text-muted-strong">Reviewer</p>
                  <p className="font-medium">{selectedReview.reviewerName || selectedReview.reviewerEmail || 'Anonymous'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-strong">Rating</p>
                  <p className="font-medium">{selectedReview.rating}/5 stars</p>
                </div>
                <div>
                  <p className="text-xs text-muted-strong">Comment</p>
                  <p className="text-sm">{selectedReview.comment || 'No comment provided.'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-strong">Current Status</p>
                  <Badge variant={selectedReview.status === 'published' ? 'secondary' : 'outline'}>
                    {selectedReview.status || 'pending'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Action</p>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="action-publish"
                    value="publish"
                    checked={actionType === 'publish'}
                    onChange={(e) => setActionType(e.target.value)}
                  />
                  <label htmlFor="action-publish" className="text-sm cursor-pointer">
                    Publish / Approve
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="action-hide"
                    value="hide"
                    checked={actionType === 'hide'}
                    onChange={(e) => setActionType(e.target.value)}
                  />
                  <label htmlFor="action-hide" className="text-sm cursor-pointer">
                    Hide / Reject
                  </label>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setActionTarget(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={actionType === 'hide' ? 'outline' : 'default'}
            onClick={handleModerateReview}
          >
            {actionType === 'publish' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {actionType === 'publish' ? 'Publish' : 'Hide'}
          </Button>
        </DialogFooter>
      </Dialog>
    </AdminPageWrapper>
  )
}
