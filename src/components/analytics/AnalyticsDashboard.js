'use client'

import { BookOpen, FolderKanban, Star, Users, TrendingUp, ArrowUpRight, BarChart3, Activity } from 'lucide-react'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'

export function AnalyticsDashboard({ summary, role = 'faculty' }) {
  if (!summary) return null

  const topResources = Array.isArray(summary.topResources) ? summary.topResources : []
  const reviews = Array.isArray(summary.reviews) ? summary.reviews : []

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Primary Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Resources"
          value={summary.summary?.totalResources || 0}
          description={`${summary.summary?.liveResources || 0} Published`}
          icon={BookOpen}
          trend="up"
          trendLabel="+12%"
          color="primary"
        />
        <StatCard
          label="Average Rating"
          value={summary.averageRating || 0}
          description={`From ${summary.summary?.totalReviews || 0} Reviews`}
          icon={Star}
          color="warning"
        />
        <StatCard
          label="Collections"
          value={summary.summary?.totalCollections || 0}
          description={role === 'student' ? 'Saved Collections' : 'Active Collections'}
          icon={FolderKanban}
          color="info"
        />
        <StatCard
          label="Total Users"
          value={summary.summary?.totalUsers || 0}
          description={role === 'admin' ? 'Platform Users' : 'Active Students'}
          icon={Users}
          color="success"
        />
      </div>

      {/* Engagement Insights */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Top Content */}
        <StandardCard className="lg:col-span-12 xl:col-span-5 p-0 overflow-hidden border-border/40 bg-card/40">
          <div className="p-6 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <TrendingUp size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Popular Content</h3>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Resources with highest engagement</p>
              </div>
            </div>
            <BarChart3 size={16} className="text-primary/40" />
          </div>
          <div className="p-6 space-y-4">
            {topResources.length > 0 ? topResources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border/40 bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-all group cursor-default">
                <div className="min-w-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-all">
                    <BookOpen size={16} className="text-primary/60 group-hover:text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{resource.title}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/40">Engagement: {resource.downloads || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                  {resource.downloads || 0}
                  <ArrowUpRight size={12} strokeWidth={3} />
                </div>
              </div>
            )) : (
              <div className="py-16 text-center">
                <p className="text-xs font-medium text-muted-foreground/40 italic">No engagement data recorded yet.</p>
              </div>
            )}
          </div>
        </StandardCard>

        {/* Feedback Stream */}
        <StandardCard className="lg:col-span-12 xl:col-span-7 p-0 overflow-hidden border-border/40 bg-card/40">
          <div className="px-6 py-5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning-strong">
                <Activity size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Reviews</h3>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">What students and faculty are saying</p>
              </div>
            </div>
            <Activity size={16} className="text-warning-strong/40" />
          </div>
          <div className="p-6 grid gap-4 md:grid-cols-2">
            {reviews.length > 0 ? reviews.map((review) => (
              <div key={review.id} className="p-5 rounded-2xl border border-border/40 bg-muted/5 hover:bg-muted/10 hover:border-warning/20 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-warning/10 flex items-center justify-center text-warning-strong text-[10px] font-bold">
                      {review.rating}
                    </div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-warning-strong transition-colors truncate max-w-[120px]">
                      {review.reviewerName || review.reviewerEmail || 'Anonymous User'}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground/40">v1.2.x</span>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed line-clamp-2 italic border-l-2 border-warning/20 pl-3">
                  "{review.comment || 'No feedback text provided'}"
                </p>
              </div>
            )) : (
              <div className="col-span-2 py-16 text-center">
                <p className="text-xs font-medium text-muted-foreground/40 italic">No reviews received yet.</p>
              </div>
            )}
          </div>
        </StandardCard>
      </div>
    </div>
  )
}
