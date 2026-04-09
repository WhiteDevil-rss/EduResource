'use client'

import {
  BookOpen,
  Bookmark,
  Library,
  Star,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { StudentDashboardSkeleton } from '@/components/LoadingStates'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useAuth } from '@/hooks/useAuth'
import { useBookmark } from '@/hooks/useBookmark'
import { cn } from '@/lib/cn'
import { formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AppLayout,
  PageContainer,
  ContentSection,
  GridContainer,
  StatCard,
  ResponsiveFilterBar,
  ResponsiveNotificationPanel,
  NotificationItem,
} from '@/components/layout'
import { PaginationControls } from '@/components/ui/layout'
import { StudentResourceCard } from '@/components/student/StudentResourceCard'

const DOWNLOADS_STORAGE_KEY = 'sps.educationam.downloads.v1'

const LazyResourceViewer = lazy(() => import('@/components/ResourceViewer').then((module) => ({ default: module.ResourceViewer })))
const LazyAnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard })))
const LazyCollectionManager = lazy(() => import('@/components/CollectionManager').then((module) => ({ default: module.CollectionManager })))
const LazyRecommendationPanel = lazy(() => import('@/components/RecommendationPanel').then((module) => ({ default: module.RecommendationPanel })))
const LazyNotificationPreferencesPanel = lazy(() => import('@/components/NotificationPreferencesPanel').then((module) => ({ default: module.NotificationPreferencesPanel })))
const LazySavedSearchPanel = lazy(() => import('@/components/SavedSearchPanel').then((module) => ({ default: module.SavedSearchPanel })))

function PanelSkeleton({ minHeight = 'min-h-[220px]' }) {
  return (
    <div className={`w-full ${minHeight} rounded-xl border border-border/40 bg-card/40 p-6 animate-pulse`} />
  )
}

function inferResourceFormat(fileUrl) {
  const value = String(fileUrl || '').toLowerCase()
  if (value.endsWith('.mp4') || value.endsWith('.mov')) {
    return { format: 'Video', size: '45MB', isPlayable: true }
  }
  if (value.endsWith('.zip')) {
    return { format: 'ZIP', size: '256MB', isPlayable: false }
  }
  return { format: 'PDF', size: '12MB', isPlayable: false }
}

function normalizeStudentResource(entry) {
  const inferred = inferResourceFormat(entry?.fileUrl)
  const incomingStatus = String(entry?.uploadStatus || entry?.status || '').toLowerCase()
  const safeProgress = Number(entry?.uploadProgress)
  const uploadStatus = ['uploading', 'failed', 'completed'].includes(incomingStatus)
    ? incomingStatus
    : safeProgress > 0 && safeProgress < 100 ? 'uploading' : 'completed'
  const uploadProgress = Number.isFinite(safeProgress)
    ? Math.max(0, Math.min(100, safeProgress))
    : uploadStatus === 'uploading' ? 45 : uploadStatus === 'failed' ? 0 : 100

  return {
    id: entry?.id,
    title: entry?.title || 'Untitled Resource',
    subject: entry?.subject || 'General',
    class: entry?.class || 'CORE 101',
    summary: entry?.summary || 'No description available.',
    fileUrl: entry?.fileUrl || '',
    facultyName: entry?.facultyName || entry?.facultyEmail || 'Faculty',
    facultyEmail: entry?.facultyEmail || '',
    createdAt: entry?.createdAt || null,
    updatedAt: entry?.updatedAt || null,
    uploadStatus,
    uploadProgress,
    updatedLabel: formatRelativeUpdate(entry?.updatedAt || entry?.createdAt),
    isBookmarked: entry?.isBookmarked || false,
    ...inferred,
  }
}

function loadDownloadsFromStorage() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DOWNLOADS_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistDownloads(downloads) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(downloads))
    }
  } catch (err) {
    console.error('Persistence error:', err)
  }
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const { toggleBookmark } = useBookmark()

  // State
  const [resources, setResources] = useState([])
  const [, setDownloads] = useState([])
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [resourceRequest, setResourceRequest] = useState({
    courseName: '',
    titleName: '',
    preferredFormat: 'pdf',
    details: '',
  })
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [resourcePage, setResourcePage] = useState(1)
  const [previewResource, setPreviewResource] = useState(null)
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false)
  const [collections, setCollections] = useState([])
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const debouncedSearchInput = useDebouncedSearch(searchInput, 500)

  // Initial Sync
  useEffect(() => {
    setDownloads(loadDownloadsFromStorage())
  }, [])

  // Resource Loading
  useEffect(() => {
    if (!user?.uid) return
    let isActive = true
    const controller = new globalThis.AbortController()

    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/student/resources', { cache: 'no-store', signal: controller.signal })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Failed to load resources.')
        if (isActive) {
          const normalized = (payload?.resources || []).map(normalizeStudentResource)
          setResources(normalized)
        }
      } catch (err) {
        if (err.name !== 'AbortError') toast.error(err.message)
      } finally {
        if (isActive) setLoading(false)
      }
    }
    load()
    return () => { isActive = false; controller.abort() }
  }, [user?.uid])

  // Engagement Sync
  useEffect(() => {
    if (!user?.uid) return
    let isActive = true
    const controller = new globalThis.AbortController()

    const loadExtra = async () => {
      try {
        const [notifRes, collRes, statsRes] = await Promise.all([
          fetch('/api/student/notifications', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/collections', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/analytics/summary', { cache: 'no-store', signal: controller.signal }),
        ])

        if (isActive && notifRes.ok) {
          const payload = await notifRes.json().catch(() => ({}))
          setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
        }
        if (isActive && collRes.ok) {
          const payload = await collRes.json().catch(() => ({}))
          setCollections(Array.isArray(payload?.collections) ? payload.collections : [])
        }
        if (isActive && statsRes.ok) {
          const payload = await statsRes.json().catch(() => ({}))
          setAnalyticsSummary(payload?.summary || null)
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Engagement sync error:', err)
      }
    }
    loadExtra()
    return () => { isActive = false; controller.abort() }
  }, [user?.uid])

  // Handlers
  const handleResourceAction = useCallback((entry) => {
    if (entry.uploadStatus === 'uploading') {
      toast.error('This resource is currently being processed.')
      return
    }

    setDownloads((current) => {
      const next = [
        {
          id: entry.id,
          title: entry.title,
          subject: entry.subject,
          fileUrl: entry.fileUrl,
          fileFormat: entry.format || 'File',
          downloadedAt: new Date().toISOString(),
        },
        ...current.filter((d) => d.id !== entry.id),
      ].slice(0, 10)
      persistDownloads(next)
      return next
    })

    toast.success('Resource added to your library')
    if (typeof window !== 'undefined') {
      window.open(`/api/student/resources/${entry.id}/download`, '_blank', 'noopener,noreferrer')
    }
  }, [])

  const handlePreviewResource = useCallback((entry) => {
    setPreviewResource(entry)
    setResourceViewerOpen(true)
  }, [])

  const handleToggleBookmark = useCallback(async (entry) => {
    if (!entry?.id) return
    await toggleBookmark(entry.id)
  }, [toggleBookmark])

  const readAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/student/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })
      if (response.ok) {
        const payload = await response.json()
        setNotifications(payload.notifications || [])
        toast.success('Notifications cleared')
      }
    } catch {
      toast.error('Failed to clear notifications')
    }
  }, [])

  const handleRequestSubmit = async () => {
    if (!resourceRequest.titleName || !resourceRequest.courseName) {
      toast.error('Please enter both title and course code.')
      return
    }
    setRequestSubmitting(true)
    try {
      const response = await fetch('/api/student/resource-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceRequest),
      })
      if (!response.ok) throw new Error('Failed to submit request')
      toast.success('Your request has been sent to faculty members.')
      setRequestModalOpen(false)
      setResourceRequest({ courseName: '', titleName: '', preferredFormat: 'pdf', details: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRequestSubmitting(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewTarget?.id) return
    try {
      const response = await fetch(`/api/resources/${reviewTarget.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      if (!response.ok) throw new Error('Failed to submit review')
      toast.success('Your review has been submitted. Thank you!')
      setReviewTarget(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Derived Stats
  const stats = useMemo(() => ([
    { label: 'Total Resources', value: resources.length, icon: Library, color: 'primary' },
    { label: 'Processing', value: resources.filter(r => r.uploadStatus === 'uploading').length, icon: Clock, color: 'warning' },
    { label: 'Bookmarked', value: resources.filter(r => r.isBookmarked).length, icon: Bookmark, color: 'info' },
    { label: 'Ready for Download', value: resources.filter(r => r.uploadStatus === 'completed').length, icon: CheckCircle2, color: 'success' },
  ]), [resources])

  const filteredResources = useMemo(() => {
    const q = debouncedSearchInput.toLowerCase()
    return resources.filter((r) => {
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.class.toLowerCase().includes(q)
      const matchesClass = selectedClass === 'all' || r.class === selectedClass
      const matchesSubject = selectedSubject === 'all' || r.subject === selectedSubject
      return matchesSearch && matchesClass && matchesSubject
    })
  }, [resources, debouncedSearchInput, selectedClass, selectedSubject])

  useEffect(() => {
    setResourcePage(1)
  }, [debouncedSearchInput, selectedClass, selectedSubject])

  const pageSize = 12
  const totalResourcePages = Math.max(1, Math.ceil(filteredResources.length / pageSize))
  const paginatedResources = useMemo(() => {
    const startIndex = (resourcePage - 1) * pageSize
    return filteredResources.slice(startIndex, startIndex + pageSize)
  }, [filteredResources, resourcePage])

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const filterConfig = useMemo(() => [
    { id: 'search', type: 'search', label: 'Search Resources', placeholder: 'Find resources...', value: searchInput },
    {
      id: 'class',
      type: 'select',
      label: 'Class',
      value: selectedClass,
      options: [{ label: 'All Classes', value: 'all' }, ...[...new Set(resources.map(r => r.class))].map(c => ({ label: c, value: c }))]
    },
    {
      id: 'subject',
      type: 'select',
      label: 'Subject',
      value: selectedSubject,
      options: [{ label: 'All Subjects', value: 'all' }, ...[...new Set(resources.map(r => r.subject))].map(s => ({ label: s, value: s }))]
    },
  ], [searchInput, selectedClass, selectedSubject, resources])

  if (loading) return <StudentDashboardSkeleton />

  return (
    <AppLayout
      role="student"
      userLabel={getDisplayName(user?.email, 'Student')}
      sidebarTitle="EDUCATIONAM"
      sidebarSubtitle="Student Workspace"
      navItems={[
        { id: 'overview', label: 'Overview', href: '#overview', icon: Library },
        { id: 'resources', label: 'Library', href: '#resources', icon: BookOpen },
        { id: 'insights', label: 'Insights', href: '#insights', icon: Star },
        { id: 'personal', label: 'Personal', href: '#personal', icon: Bookmark },
      ]}
      topbarTitle="Student Console"
      topbarSubtitle="Manage and sync your academic assets"
      unreadCount={notifications.filter(n => !n.isRead).length}
      onOpenNotifications={() => setNotificationsOpen(true)}
      onLogout={logout}
    >
      <PageContainer>
        {/* Statistics Grid */}
        <ContentSection id="overview" title="Workspace Status" subtitle="Overview of your available academic resources" noPaddingBottom>
          <GridContainer columns={4}>
            {stats.map((stat, i) => (
              <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />
            ))}
          </GridContainer>
        </ContentSection>

        {/* Main Discovery */}
        <ContentSection id="resources" title="Resource Library" subtitle="Browse and download approved course materials">
          <ResponsiveFilterBar
            filters={filterConfig}
            onFilterChange={(id, val) => {
              if (id === 'search') setSearchInput(val)
              else if (id === 'class') setSelectedClass(val)
              else if (id === 'subject') setSelectedSubject(val)
            }}
            onReset={() => {
              setSearchInput('')
              setSelectedClass('all')
              setSelectedSubject('all')
            }}
          />

          <div className="mt-8">
            {filteredResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-dashed border-border/40 bg-muted/5">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                  <BookOpen size={32} className="text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No resources found</h3>
                <p className="mt-1 text-xs text-muted-foreground">Adjust your filters to see more results.</p>
              </div>
            ) : (
              <>
                <GridContainer columns={3}>
                  {paginatedResources.map((resource) => (
                    <StudentResourceCard
                      key={resource.id}
                      resource={resource}
                      bookmarked={resource.isBookmarked}
                      onPreview={handlePreviewResource}
                      onDownload={handleResourceAction}
                      onBookmark={handleToggleBookmark}
                      onReview={(r) => setReviewTarget(r)}
                    />
                  ))}
                </GridContainer>
                {filteredResources.length > pageSize && (
                  <div className="mt-6">
                    <PaginationControls
                      page={resourcePage}
                      pages={totalResourcePages}
                      total={filteredResources.length}
                      loading={false}
                      onPrevious={() => setResourcePage((current) => Math.max(1, current - 1))}
                      onNext={() => setResourcePage((current) => Math.min(totalResourcePages, current + 1))}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </ContentSection>

        {/* Insights & Collections */}
        {(analyticsSummary || collections.length > 0) && (
          <ContentSection id="insights" title="Learning Insights" subtitle="Visual overview of your platform engagement">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {analyticsSummary && (
                <Suspense fallback={<PanelSkeleton minHeight="min-h-[360px]" />}>
                  <LazyAnalyticsDashboard summary={analyticsSummary} />
                </Suspense>
              )}
              {collections.length > 0 && (
                <Suspense fallback={<PanelSkeleton minHeight="min-h-[360px]" />}>
                  <LazyCollectionManager collections={collections} onToggleSave={() => { }} />
                </Suspense>
              )}
            </div>
          </ContentSection>
        )}

        {/* Personalization */}
        <ContentSection id="personal" title="Workspace Management" subtitle="Customize and manage your academic workspace">
          <GridContainer columns={3}>
            <Suspense fallback={<PanelSkeleton />}>
              <LazyRecommendationPanel />
            </Suspense>
            <Suspense fallback={<PanelSkeleton />}>
              <LazySavedSearchPanel />
            </Suspense>
            <div className="flex flex-col gap-6">
              <Suspense fallback={<PanelSkeleton />}>
                <LazyNotificationPreferencesPanel />
              </Suspense>
              <div className="mt-auto overflow-hidden rounded-xl border border-primary/10 bg-primary/5 p-6">
                <h4 className="text-xs font-semibold text-primary">Need a specific resource?</h4>
                <p className="mt-2 text-[11px] leading-relaxed text-primary/70">
                  Request specialized content or materials directly from your instructors.
                </p>
                <Button
                  className="mt-6 w-full h-10 rounded-lg bg-primary font-semibold text-xs shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
                  onClick={() => setRequestModalOpen(true)}
                >
                  Create Request
                </Button>
              </div>
            </div>
          </GridContainer>
        </ContentSection>
      </PageContainer>

      {/* Global Modals */}
      <ResponsiveNotificationPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notificationCount={notifications.length}
        unreadCount={unreadNotifications}
        onMarkAllRead={readAllNotifications}
        isLoading={notificationsLoading}
      >
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            title={n.title}
            description={n.message}
            timestamp={n.createdAt}
            isUnread={!n.isRead}
          />
        ))}
      </ResponsiveNotificationPanel>

      {resourceViewerOpen && (
        <Suspense fallback={<PanelSkeleton minHeight="min-h-[320px]" />}>
          <LazyResourceViewer
            resource={previewResource}
            onClose={() => setResourceViewerOpen(false)}
          />
        </Suspense>
      )}

      {/* Resource Request Dialog */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogHeader className="p-6 pb-4 border-b border-border/10">
          <DialogTitle className="text-sm font-semibold">Request Resource</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-6 py-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Title</label>
              <Input
                value={resourceRequest.titleName}
                onChange={(e) => setResourceRequest({ ...resourceRequest, titleName: e.target.value })}
                placeholder="e.g. Advanced Calculus Notes"
                className="h-10 rounded-lg border-border/40 bg-muted/20 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Course Code</label>
              <Input
                value={resourceRequest.courseName}
                onChange={(e) => setResourceRequest({ ...resourceRequest, courseName: e.target.value })}
                placeholder="e.g. MATH301"
                className="h-10 rounded-lg border-border/40 bg-muted/20 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Additional Details</label>
              <Textarea
                value={resourceRequest.details}
                onChange={(e) => setResourceRequest({ ...resourceRequest, details: e.target.value })}
                placeholder="Briefly describe what you need..."
                rows={4}
                className="rounded-lg border-border/40 bg-muted/20 text-xs"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="p-6 pt-4 border-t border-border/10 flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-lg font-medium text-xs h-10" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
          <Button className="flex-[2] rounded-lg font-semibold text-xs h-10" onClick={handleRequestSubmit} disabled={requestSubmitting}>
            {requestSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Resource Review Dialog */}
      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogHeader className="p-6 pb-4 border-b border-border/10">
          <DialogTitle className="text-sm font-semibold">Review: {reviewTarget?.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-6 py-6 space-y-8">
          <div className="space-y-4">
            <label className="text-[11px] font-medium text-muted-foreground text-center block">Rating: {reviewRating}/5</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setReviewRating(i)} className="transition-transform active:scale-90">
                  <Star size={28} className={cn(i <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground/20")} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Your Review</label>
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your thoughts on this resource..."
              rows={4}
              className="rounded-lg border-border/40 bg-muted/20 text-xs"
            />
          </div>
        </DialogBody>
        <DialogFooter className="p-6 pt-4 border-t border-border/10 flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-lg font-medium text-xs h-10" onClick={() => setReviewTarget(null)}>Cancel</Button>
          <Button className="flex-[2] rounded-lg font-semibold text-xs h-10" onClick={handleSubmitReview}>Submit Review</Button>
        </DialogFooter>
      </Dialog>
    </AppLayout>
  )
}
