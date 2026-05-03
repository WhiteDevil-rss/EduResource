'use client'

import {
  BookOpen,
  Bookmark,
  Library,
  Star,
  Clock,
  CheckCircle2,
  UserCircle,
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
  StandardCard,
  ResponsiveFilterBar,
  ResponsiveNotificationPanel,
  NotificationItem,
} from '@/components/layout'
import { PaginationControls } from '@/components/ui/layout'
import { StudentResourceCard } from '@/components/student/StudentResourceCard'

const DOWNLOADS_STORAGE_KEY = 'sps.educationam.downloads.v1'

const LazyResourceViewer = lazy(() => import('@/components/ResourceViewer').then((module) => ({ default: module.ResourceViewer })))
const LazyNotificationPreferencesPanel = lazy(() => import('@/components/NotificationPreferencesPanel').then((module) => ({ default: module.NotificationPreferencesPanel })))

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
    // Silent
  }
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const { toggleBookmark, saving: bookmarkSaving } = useBookmark()

  // State
  const [resources, setResources] = useState([])
  const [, setDownloads] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
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
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [targetReviews, setTargetReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

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
        const notifRes = await fetch('/api/notifications', { cache: 'no-store', signal: controller.signal })

        if (isActive && notifRes.ok) {
          const payload = await notifRes.json().catch(() => ({}))
          setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
          setUnreadCount(Number(payload?.unreadCount || 0))
        }
      } catch (err) {
        // Silent
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
    if (!entry?.id || bookmarkSaving) return
    
    // Optimistic update
    const previousStatus = entry.isBookmarked
    const nextStatus = !previousStatus
    
    setResources(prev => prev.map(r => 
      r.id === entry.id ? { ...r, isBookmarked: nextStatus } : r
    ))

    try {
      const result = await toggleBookmark(entry.id)
      // Use the actual status from the server if it differs from our optimistic guess
      // but usually they should match.
      setResources(prev => prev.map(r => 
        r.id === entry.id ? { ...r, isBookmarked: result.bookmarked } : r
      ))
    } catch (error) {
      // Revert on error
      setResources(prev => prev.map(r => 
        r.id === entry.id ? { ...r, isBookmarked: previousStatus } : r
      ))
    }
  }, [toggleBookmark, bookmarkSaving])

  const readAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })
      if (response.ok) {
        const payload = await response.json().catch(() => ({}))
        setNotifications(payload.notifications || [])
        setUnreadCount(Number(payload.unreadCount || 0))
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

  const handleReviewClick = useCallback(async (resource) => {
    setReviewTarget(resource)
    setReviewRating(5)
    setReviewComment('')
    setReviewsLoading(true)
    try {
      const response = await fetch(`/api/resources/${resource.id}/reviews`)
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        setTargetReviews(payload.reviews || [])
      }
    } catch (err) {
      // Silent error
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  const handleSubmitReview = async () => {
    if (!reviewTarget?.id) return
    try {
      const response = await fetch(`/api/resources/${reviewTarget.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to submit review')
      toast.success('Your review has been submitted. Thank you!')
      
      // Refresh reviews list
      const freshRes = await fetch(`/api/resources/${reviewTarget.id}/reviews`)
      const freshPayload = await freshRes.json().catch(() => ({}))
      if (freshRes.ok) setTargetReviews(freshPayload.reviews || [])
      
      setReviewComment('')
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

  // Remove unreadNotifications memo as we use state now

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

  const bookmarkedCount = resources.filter(r => r.isBookmarked).length

  const studentNavSections = [
    {
      label: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', href: '#overview', icon: Library },
        { id: 'library', label: 'Library', href: '#library', icon: BookOpen },
        { id: 'saved', label: 'Saved', href: '#saved', icon: Bookmark, badge: bookmarkedCount > 0 ? bookmarkedCount : null },
      ],
    },
    {
      label: 'Personal',
      items: [
        { id: 'personal', label: 'Profile Settings', href: '#personal', icon: UserCircle },
      ],
    },
  ]

  return (
    <AppLayout
      role="student"
      userLabel={getDisplayName(user?.email, 'Student')}
      sidebarTitle="SPS Educationam"
      sidebarSubtitle="Student Workspace"
      navSections={studentNavSections}
      navItems={[
        { id: 'overview', label: 'Overview', href: '#overview', icon: Library },
        { id: 'library', label: 'Library', href: '#library', icon: BookOpen },
        { id: 'saved', label: 'Saved', href: '#saved', icon: Bookmark },
        { id: 'insights', label: 'Insights', href: '#insights', icon: Star },
        { id: 'personal', label: 'Personal', href: '#personal', icon: UserCircle },
      ]}
      topbarTitle="Student Console"
      topbarSubtitle="Manage and sync your academic assets"
      unreadCount={notifications.filter(n => !n.isRead).length}
      onOpenNotifications={() => setNotificationsOpen(true)}
      onLogout={logout}
    >
      <PageContainer>
        <StandardCard className="mb-6 overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Student workspace
              </p>
              <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                Discover course material, keep your library organized, and stay on top of requests.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                The student panel is now built around faster discovery, clearer resource cards, and a calmer
                workspace hierarchy for mobile and desktop.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:w-[260px]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Resources</p>
                <p className="mt-2 text-2xl font-semibold">{resources.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Bookmarks</p>
                <p className="mt-2 text-2xl font-semibold">
                  {resources.filter((resource) => resource.isBookmarked).length}
                </p>
              </div>
            </div>
          </div>
        </StandardCard>

        <ContentSection id="overview" title="Workspace Status" subtitle="Your current study surface at a glance" noPaddingBottom>
          <GridContainer columns={4}>
            {stats.map((stat, i) => (
              <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />
            ))}
          </GridContainer>
        </ContentSection>

        <ContentSection id="library" title="Resource Library" subtitle="Access your curated academic materials">
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
                      onReview={handleReviewClick}
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

        {/* Saved Content Section */}
        <ContentSection id="saved" title="Saved Resources" subtitle="Quick access to your bookmarked materials">
          {resources.filter(r => r.isBookmarked).length > 0 ? (
            <GridContainer columns={3}>
              {resources.filter(r => r.isBookmarked).map((resource) => (
                <StudentResourceCard
                  key={resource.id}
                  resource={resource}
                  bookmarked={resource.isBookmarked}
                  onPreview={handlePreviewResource}
                  onDownload={handleResourceAction}
                  onBookmark={handleToggleBookmark}
                  onReview={handleReviewClick}
                />
              ))}
            </GridContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-border/60 bg-muted/5">
              <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground/40 mb-4">
                <Bookmark size={32} />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No saved resources yet</h4>
              <p className="text-xs text-muted-foreground mt-1">Bookmark resources from the library to see them here.</p>
            </div>
          )}
        </ContentSection>



        {/* Personalization */}
        <ContentSection id="personal" title="Workspace Management" subtitle="Personalize alerts and manage resource requests">
          <div className="grid gap-6 md:grid-cols-2">
            <Suspense fallback={<PanelSkeleton />}>
              <LazyNotificationPreferencesPanel />
            </Suspense>
            <div className="overflow-hidden rounded-2xl border border-primary/10 bg-primary/5 p-8 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Library size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Need a specific resource?</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Request specialized content or materials directly from your instructors.
                  </p>
                </div>
                <Button
                  className="mt-4 w-full h-12 rounded-xl bg-primary font-semibold text-sm shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
                  onClick={() => setRequestModalOpen(true)}
                >
                  Create Request
                </Button>
              </div>
            </div>
          </div>
        </ContentSection>
      </PageContainer>

      {/* Global Modals */}
      <ResponsiveNotificationPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notificationCount={notifications.length}
        unreadCount={unreadCount}
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
            open={resourceViewerOpen}
            onOpenChange={setResourceViewerOpen}
            resource={previewResource}
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
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary px-1">Additional Details</label>
              <Textarea
                value={resourceRequest.details}
                onChange={(e) => setResourceRequest({ ...resourceRequest, details: e.target.value })}
                placeholder="Briefly describe what you need..."
                className="resize-none shadow-sm"
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
      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)} className="max-w-3xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/10">
          <DialogTitle className="text-sm font-semibold">Reviews: {reviewTarget?.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-0 max-h-[70vh] overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Existing Reviews */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Community Feedback</h4>
              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-20 w-full animate-pulse rounded-xl bg-muted/20" />)}
                </div>
              ) : targetReviews.length > 0 ? (
                <div className="space-y-3">
                  {targetReviews.map((rev) => (
                    <div key={rev.id} className="rounded-xl border border-border/10 bg-muted/5 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{rev.reviewerName || 'Student'}</p>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={10} className="fill-current" />
                          <span className="text-[10px] font-bold">{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center rounded-xl border border-dashed border-border/20">
                  <p className="text-xs text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>

            {/* Submit New Review */}
            <div className="space-y-6 pt-6 border-t border-border/10">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary px-1">Write a Review</h4>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-2">
                  <label className="text-[11px] font-medium text-muted-foreground">Rate this resource</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button key={i} onClick={() => setReviewRating(i)} className="transition-transform active:scale-90">
                        <Star size={28} className={cn(i <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground/20")} strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Your Feedback</label>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="What did you think of this material? Was it helpful for your exams?"
                    className="min-h-[100px] shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="p-6 pt-4 border-t border-border/10 flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-lg font-medium text-xs h-10" onClick={() => setReviewTarget(null)}>Close</Button>
          <Button className="flex-[2] rounded-lg font-semibold text-xs h-10 shadow-lg shadow-primary/20" onClick={handleSubmitReview}>Submit Review</Button>
        </DialogFooter>
      </Dialog>
    </AppLayout>
  )
}
