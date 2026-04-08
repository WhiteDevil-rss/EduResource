'use client'

import { BookOpen, FolderKanban, Star, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function MetricCard({ label, value, description, icon: Icon }) {
  return (
    <Card className="rounded-xl border border-outline shadow-sm bg-surface-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle>{value}</CardTitle>
        </div>
        {Icon ? <Icon size={18} className="text-primary" /> : null}
      </CardHeader>
      {description ? <CardContent className="pt-0 px-4 pb-4 text-sm text-muted">{description}</CardContent> : null}
    </Card>
  )
}

export function AnalyticsDashboard({ summary, role = 'faculty' }) {
  if (!summary) {
    return null
  }

  const topResources = Array.isArray(summary.topResources) ? summary.topResources : []
  const collections = Array.isArray(summary.collections) ? summary.collections : []
  const reviews = Array.isArray(summary.reviews) ? summary.reviews : []

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Resources" value={summary.summary?.totalResources || 0} description={`${summary.summary?.liveResources || 0} live, ${summary.summary?.draftResources || 0} draft`} icon={BookOpen} />
        <MetricCard label="Reviews" value={summary.summary?.totalReviews || 0} description={`Avg rating ${summary.averageRating || 0}/5`} icon={Star} />
        <MetricCard label="Collections" value={summary.summary?.totalCollections || 0} description={role === 'student' ? 'Saved collections' : 'Created collections'} icon={FolderKanban} />
        <MetricCard label="Users" value={summary.summary?.totalUsers || 0} description={role === 'admin' ? 'Platform users' : 'Visible user records'} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border border-outline shadow-sm bg-surface-card">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Top Resources</CardTitle>
            <CardDescription>Most engaged resources in the current scope.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {topResources.length > 0 ? topResources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between gap-4 rounded-lg border border-outline/50 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{resource.title}</p>
                  <p className="text-xs text-muted">{resource.downloads || 0} download event(s)</p>
                </div>
                <Badge variant="outline">#{resource.downloads || 0}</Badge>
              </div>
            )) : <p className="text-sm text-muted">No engagement data yet.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-outline shadow-sm bg-surface-card">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Recent Reviews</CardTitle>
            <CardDescription>Newest feedback and moderation activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {reviews.length > 0 ? reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-outline/50 p-3 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{review.reviewerName || review.reviewerEmail || 'Anonymous'}</p>
                  <Badge variant="secondary">{review.rating}/5</Badge>
                </div>
                <p className="text-sm text-muted line-clamp-2">{review.comment || 'No comment provided.'}</p>
              </div>
            )) : <p className="text-sm text-muted">No reviews yet.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-outline shadow-sm bg-surface-card">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Collections</CardTitle>
            <CardDescription>Latest playlists and learning paths.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {collections.length > 0 ? collections.map((collection) => (
              <div key={collection.id} className="rounded-lg border border-outline/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{collection.title}</p>
                  <Badge variant={collection.visibility === 'public' ? 'secondary' : 'outline'}>{collection.totalResources || 0}</Badge>
                </div>
                <p className="text-sm text-muted line-clamp-2">{collection.description || 'No description provided.'}</p>
              </div>
            )) : <p className="text-sm text-muted">No collections yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
