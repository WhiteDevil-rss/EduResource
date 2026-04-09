'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PageContainer,
  ContentSection,
} from '@/components/layout'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Eye, ShieldCheck, MessageSquare, Flag, Send, Trash, Clock, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser } from '@/lib/admin-protection'
import { cn } from '@/lib/cn'

export default function AdminModerationPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState('publish')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdminUser(user)) {
      router.replace('/login?reason=unauthorized')
    }
  }, [authLoading, user, router])

  const loadData = useCallback(async (signal) => {
    if (!user || !isAdminUser(user)) return
    try {
      setLoading(true)
      const response = await fetch('/api/admin/moderation', { cache: 'no-store', signal })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to sync moderation data.')
      setReviews(Array.isArray(payload?.reviews) ? payload.reviews : [])
    } catch (loadError) {
      if (loadError.name === 'AbortError') return
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    const controller = new globalThis.AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [authLoading, loadData])

  const handleModerateReview = async () => {
    if (!actionTarget?.id || saving) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/moderation/reviews/${actionTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to update review.')

      toast.success(actionType === 'publish' ? 'Review published successfully.' : 'Review hidden successfully.')
      setReviews((current) =>
        current.map((review) => (review.id === actionTarget.id ? payload.review : review))
      )
      setActionTarget(null)
      setSelectedReview(null)
    } catch (loadError) {
      toast.error(loadError.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenModeration = (review) => {
    setSelectedReview(review)
    setActionTarget(review)
    setActionType('publish')
  }

  const pendingCount = useMemo(() => reviews.filter(r => r.status !== 'published' && r.status !== 'hidden').length, [reviews])
  const publishedCount = useMemo(() => reviews.filter(r => r.status === 'published').length, [reviews])
  const hiddenCount = useMemo(() => reviews.filter(r => r.status === 'hidden').length, [reviews])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection
        title="Content Moderation"
        subtitle="Review platform reviews and interactions to maintain academic integrity"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} />
            Policy: platform standard
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <div className="space-y-8">
          {/* Metrics Surface */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Pending Review"
              value={pendingCount}
              description="Awaiting action"
              icon={Clock}
              color="warning"
              trend={pendingCount > 0 ? +pendingCount : 0}
            />
            <StatCard
              label="Published"
              value={publishedCount}
              description="Visible interactions"
              icon={CheckCircle2}
              color="success"
            />
            <StatCard
              label="Hidden"
              value={hiddenCount}
              description="Restricted content"
              icon={ShieldAlert}
              color="destructive"
            />
          </div>

          {/* Moderation Queue */}
          <SkeletonWrapper name="admin-moderation" loading={loading}>
            <div className="space-y-6">
              <StandardCard title="Moderation Queue" icon={MessageSquare} className="p-0 overflow-hidden border-border/40">
                <div className="p-2 min-h-[400px]">
                  {reviews.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/30">
                        <ShieldCheck size={32} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground text-center">Queue Clear</h3>
                        <p className="text-xs text-muted-foreground max-w-[240px] mx-auto text-center mt-1">
                          No pending reviews found in the moderation queue.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className={cn(
                            "group relative p-4 rounded-xl border border-border/40 transition-all flex flex-col md:flex-row gap-4 md:items-center justify-between",
                            review.status === 'hidden' ? "bg-destructive/5 saturate-50" : "bg-muted/5 hover:bg-muted/10"
                          )}
                        >
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {review.reviewerName || review.reviewerEmail || 'Anonymous User'}
                              </span>
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold tracking-tight">{review.rating}/5 RATING</Badge>
                              <Badge variant={review.status === 'published' ? 'secondary' : review.status === 'hidden' ? 'outline' : 'default'} className="text-[10px] font-bold uppercase tracking-tight">
                                {review.status || 'Pending'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2">
                              "{review.comment || 'No comment provided.'}"
                            </p>
                            <div className="flex items-center gap-2 pt-1 font-medium text-muted-foreground/60 transition-colors group-hover:text-primary/60">
                              <Flag size={10} className="text-primary/40" />
                              <span className="text-[10px] uppercase tracking-tight">
                                Source: {review.resourceTitle || 'Resource ' + review.resourceId?.slice(-6)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                              onClick={() => handleOpenModeration(review)}
                              className="w-9 h-9 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all bg-background shadow-sm"
                              title="Audit review"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </StandardCard>
            </div>
          </SkeletonWrapper>
        </div>
      </PageContainer>

      {/* Modernized Moderation Dialog */}
      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogHeader className="p-6 pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
              <ShieldAlert size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Moderation Review</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Take administrative action on this item</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="p-6 space-y-6">
          {selectedReview && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-muted/5 border border-border/40 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight">User Identity</p>
                    <p className="text-xs font-semibold text-foreground">{selectedReview.reviewerName || selectedReview.reviewerEmail || 'Anonymous'}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight">Review Rating</p>
                    <p className="text-sm font-bold text-primary">{selectedReview.rating} / 5 STARS</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-3 border-t border-border/10">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight">Content</p>
                  <p className="text-xs text-foreground italic leading-relaxed">"{selectedReview.comment || 'N/A'}"</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight ml-1">Moderation Action</p>
                <div className="grid gap-3">
                  <button
                    onClick={() => setActionType('publish')}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                      actionType === 'publish' ? "bg-emerald-500/5 border-emerald-500/30" : "bg-muted/5 border-border/40 hover:bg-muted/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={20} className={cn(actionType === 'publish' ? "text-emerald-500" : "text-muted-foreground/40")} />
                      <div>
                        <p className={cn("text-sm font-semibold", actionType === 'publish' ? "text-emerald-600" : "text-foreground")}>Approve & Publish</p>
                        <p className="text-[10px] text-muted-foreground/70 font-medium">Render as visible to all platform users</p>
                      </div>
                    </div>
                    {actionType === 'publish' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </button>

                  <button
                    onClick={() => setActionType('hide')}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                      actionType === 'hide' ? "bg-destructive/5 border-destructive/30" : "bg-muted/5 border-border/40 hover:bg-muted/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle size={20} className={cn(actionType === 'hide' ? "text-destructive" : "text-muted-foreground/40")} />
                      <div>
                        <p className={cn("text-sm font-semibold", actionType === 'hide' ? "text-destructive" : "text-foreground")}>Reject & Hide</p>
                        <p className="text-[10px] text-muted-foreground/70 font-medium">Remove from public visibility immediately</p>
                      </div>
                    </div>
                    {actionType === 'hide' && <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="p-6 pt-2 flex gap-3">
          <button
            onClick={() => setActionTarget(null)}
            className="flex-1 h-10 rounded-lg border border-border/40 text-xs font-semibold hover:bg-muted/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleModerateReview}
            disabled={saving}
            className={cn(
              "flex-[1.5] h-10 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white",
              actionType === 'hide' ? "bg-destructive hover:opacity-90 shadow-destructive/10" : "bg-primary hover:opacity-90 shadow-primary/10"
            )}
          >
            {saving ? "Processing..." : (
              <>
                {actionType === 'publish' ? <Send size={14} /> : <Trash size={14} />}
                Apply action
              </>
            )}
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
