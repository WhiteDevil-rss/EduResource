'use client'

import {
  AlertCircle,
  BookOpen,
  Bookmark,
  Download,
  HelpCircle,
  Library,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { StudentDashboardSkeleton } from '@/components/LoadingStates'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useAuth } from '@/hooks/useAuth'
import { useBookmark } from '@/hooks/useBookmark'
import { formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogDescription,
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
  ScrollableContainer,
  StatCard,
  ResponsiveFilterBar,
  ResponsiveNotificationPanel,
  NotificationItem,
} from '@/components/layout'
import { ResourceViewer } from '@/components/ResourceViewer'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { CollectionManager } from '@/components/CollectionManager'
import { RecommendationPanel } from '@/components/RecommendationPanel'
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel'
import { SavedSearchPanel } from '@/components/SavedSearchPanel'
import { StudentResourceCard } from '@/components/student/StudentResourceCard'

const DOWNLOADS_STORAGE_KEY = 'sps.educationam.downloads.v1'

function inferResourceFormat(fileUrl) {
  const value = String(fileUrl || '').toLowerCase()
  if (value.endsWith('.mp4') || value.endsWith('.mov')) {
    return { format: 'Video', size: '45m', isPlayable: true }
  }
  if (value.endsWith('.zip')) {
    return { format: 'ZIP', size: '256MB', isPlayable: false }
  }
  if (value.includes('pdf')) {
    return { format: 'PDF', size: '12MB', isPlayable: false }
  }
  return { format: 'PDF', size: '12MB', isPlayable: false }
}

function normalizeStudentResource(entry) {
  const inferred = inferResourceFormat(entry?.fileUrl)
  const incomingStatus = String(entry?.uploadStatus || entry?.status || '').toLowerCase()
  const safeProgress = Number(entry?.uploadProgress)
  const uploadStatus = ['uploading', 'failed', 'completed'].includes(incomingStatus)
    ? incomingStatus
    : safeProgress > 0 && safeProgress < 100? 'uploading': 'completed'
  const uploadProgress = Number.isFinite(safeProgress)
    ? Math.max(0, Math.min(100, safeProgress))
    : uploadStatus === 'uploading'
      ? 45
      : uploadStatus === 'failed'
        ? 0
        : 100

  return {
    id: entry?.id,
    title: entry?.title || 'Untitled Resource',
    subject: entry?.subject || 'General',
    class: entry?.class || 'CORE 101',
    summary: entry?.summary || 'No description available yet.',
    fileUrl: entry?.fileUrl || '',
    facultyName: entry?.facultyName || entry?.facultyEmail || 'Faculty member',
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
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistDownloads(downloads) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(downloads))
    }
  } catch (error) {
    console.error('Error persisting downloads:', error)
  }
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const { toggleBookmark } = useBookmark()

  // State
  const [resources, setResources] = useState([])
  const [downloads, setDownloads] = useState(loadDownloadsFromStorage())
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [, setNotificationsSaving] = useState(false)
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
  const [errorMessage, setErrorMessage] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [previewResource, setPreviewResource] = useState(null)
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false)
  const [collections, setCollections] = useState([])
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [, setCollectionsLoading] = useState(false)
  const [, setAnalyticsLoading] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const debouncedSearchInput = useDebouncedSearch(searchInput, 500)

  // Load initial downloads
  useEffect(() => {
    setDownloads(loadDownloadsFromStorage())
  }, [])

  // Load resources
  useEffect(() => {
    if (!user?.uid) return
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadResources = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/student/resources', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load resources.')
        }
        if (isActive) {
          const normalized = (payload?.resources || []).map(normalizeStudentResource)
          setResources(normalized)
          setErrorMessage('')
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          console.error('Student resources error:', error)
          setResources([])
          setErrorMessage(error.message || 'Could not load resources.')
        }
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadResources()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [user?.uid])

  // Load notifications
  useEffect(() => {
    if (!user?.uid) return
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadNotifications = async () => {
      setNotificationsLoading(true)
      try {
        const response = await fetch('/api/student/notifications', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load notifications.')
        }
        if (isActive) {
          setNotifications(Array.isArray(payload?.notifications) ? payload?.notifications : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          console.error('Student notifications error:', error)
          setNotifications([])
        }
      } finally {
        if (isActive) setNotificationsLoading(false)
      }
    }

    loadNotifications()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [user?.uid])

  // Load collections and analytics
  useEffect(() => {
    if (!user?.uid) return
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadCollectionsAndAnalytics = async () => {
      try {
        const [collectionsRes, analyticsRes] = await Promise.all([
          fetch('/api/collections', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/analytics/summary', { cache: 'no-store', signal: controller.signal }),
        ])

        if (isActive && collectionsRes.ok) {
          const payload = await collectionsRes.json().catch(() => ({}))
          setCollections(Array.isArray(payload?.collections) ? payload.collections : [])
        }

        if (isActive && analyticsRes.ok) {
          const payload = await analyticsRes.json().catch(() => ({}))
          setAnalyticsSummary(payload?.summary || null)
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        console.error('Load error:', error)
      } finally {
        if (isActive) {
          setCollectionsLoading(false)
          setAnalyticsLoading(false)
        }
      }
    }

    loadCollectionsAndAnalytics()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [user?.uid])

  // Event Handlers
  const handleResourceAction = useCallback((entry) => {
    if (entry.uploadStatus === 'uploading') {
      toast.error('This resource is still uploading.')
      return
    }

    setDownloads((current) => {
      const nextDownloads = [
        {
          id: entry.id,
          title: entry.title,
          subject: entry.subject,
          fileUrl: entry.fileUrl,
          fileType: entry.fileType || entry.type || '',
          fileSize: entry.fileSize || entry.size || 0,
          fileFormat: entry.format || 'File',
          downloadedAt: new Date().toISOString(),
        },
        ...current.filter((d) => d.id !== entry.id),
      ].slice(0, 6)
      persistDownloads(nextDownloads)
      return nextDownloads
    })
    toast.success(`${entry.title} added to your downloads.`)

    if (typeof window !== 'undefined') {
      window.open(
        `/api/student/resources/${entry.id}/download`,
        '_blank',
        'noopener,noreferrer'
      )
    }
  }, [])

  const handlePreviewResource = useCallback((entry) => {
    if (!entry?.id) {
      toast.error('Resource is missing a valid ID.')
      return
    }
    setPreviewResource(entry)
    setResourceViewerOpen(true)
  }, [])

  const handleOpenReview = useCallback((entry) => {
    if (!entry?.id) {
      toast.error('Resource is missing a valid ID.')
      return
    }
    setReviewTarget(entry)
    setReviewRating(5)
    setReviewComment('')
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
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not submit review.')
      }
      toast.success('Review submitted.')
      setReviewComment('')
      setReviewRating(5)
      setReviewTarget(null)
    } catch (error) {
      toast.error(error.message || 'Could not submit review.')
    }
  }

  const handleToggleCollectionSave = async (collection) => {
    if (!collection?.id) return
    try {
      const response = await fetch(`/api/collections/${collection.id}/save`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update saved collection.')
      }
      toast.success(payload?.saved ? 'Collection saved.' : 'Collection removed.')
      setCollections((current) =>
        current.map((item) =>
          item.id === collection.id ? { ...item, saved: payload.saved } : item
        )
      )
    } catch (error) {
      toast.error(error.message || 'Could not update saved collection.')
    }
  }

  const handleToggleBookmark = useCallback(async (entry) => {
    if (!entry?.id) {
      toast.error('Resource is missing a valid ID.')
      return
    }
    await toggleBookmark(entry.id)
  }, [toggleBookmark])

  const markNotificationRead = useCallback(async (notificationId) => {
    setNotificationsSaving(true)
    try {
      const response = await fetch('/api/student/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update notifications.')
      }
      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
    } catch (error) {
      toast.error(error.message || 'Could not update notifications.')
    } finally {
      setNotificationsSaving(false)
    }
  }, [])

  const readAllNotifications = useCallback(async () => {
    setNotificationsSaving(true)
    try {
      const response = await fetch('/api/student/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not clear notifications.')
      }
      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      toast.success('All notifications marked as read.')
    } catch (error) {
      toast.error(error.message || 'Could not clear notifications.')
    } finally {
      setNotificationsSaving(false)
    }
  }, [])

  const handleRequestSubmit = async () => {
    if (!resourceRequest.titleName || !resourceRequest.courseName) {
      toast.error('Please fill in all required fields.')
      return
    }

    setRequestSubmitting(true)
    try {
      const response = await fetch('/api/student/resource-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceRequest),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not submit the request.')
      }
      toast.success('Resource request sent.')
      setRequestModalOpen(false)
      setResourceRequest({ courseName: '', titleName: '', preferredFormat: 'pdf', details: '' })
    } catch (error) {
      toast.error(error.message || 'Could not submit the request.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  // Derived values
  const completedCount = useMemo(
    () => resources.filter((e) => e.uploadStatus === 'completed').length,
    [resources]
  )
  const uploadingCount = useMemo(
    () => resources.filter((e) => e.uploadStatus === 'uploading').length,
    [resources]
  )
  const failedCount = useMemo(
    () => resources.filter((e) => e.uploadStatus === 'failed').length,
    [resources]
  )
  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const classOptions = useMemo(
    () => ['all', ...new Set(resources.map((r) => r.class).filter(Boolean))],
    [resources]
  )
  const subjectOptions = useMemo(
    () => ['all', ...new Set(resources.map((r) => r.subject).filter(Boolean))],
    [resources]
  )

  const filteredResources = useMemo(() => {
    const normalizedQuery = debouncedSearchInput.toLowerCase()
    return resources.filter((r) => {
      const matchesSearch = normalizedQuery
        ? r.title.toLowerCase().includes(normalizedQuery) ||
          r.class.toLowerCase().includes(normalizedQuery) ||
          r.subject.toLowerCase().includes(normalizedQuery)
        : true
      const matchesClass = selectedClass === 'all' || r.class === selectedClass
      const matchesSubject = selectedSubject === 'all' || r.subject === selectedSubject
      return matchesSearch && matchesClass && matchesSubject
    })
  }, [resources, debouncedSearchInput, selectedClass, selectedSubject])

  const classFilterOptions = useMemo(
    () => classOptions.map((c) => ({
      label: c === 'all' ? 'All Classes' : c,
      value: c,
    })),
    [classOptions]
  )
  const subjectFilterOptions = useMemo(
    () => subjectOptions.map((s) => ({
      label: s === 'all' ? 'All Subjects' : s,
      value: s,
    })),
    [subjectOptions]
  )
  const filterConfig = useMemo(
    () => [
      {
        id: 'search',
        type: 'search',
        label: 'Search',
        placeholder: 'Search by title, class, or subject',
        value: searchInput,
      },
      {
        id: 'class',
        type: 'select',
        label: 'Class',
        value: selectedClass,
        options: classFilterOptions,
      },
      {
        id: 'subject',
        type: 'select',
        label: 'Subject',
        value: selectedSubject,
        options: subjectFilterOptions,
      },
    ],
    [searchInput, selectedClass, selectedSubject, classFilterOptions, subjectFilterOptions]
  )
  const handleFilterChange = useCallback((id, value) => {
    if (id === 'search') setSearchInput(value)
    if (id === 'class') setSelectedClass(value)
    if (id === 'subject') setSelectedSubject(value)
  }, [])
  const handleFilterReset = useCallback(() => {
    setSearchInput('')
    setSelectedClass('all')
    setSelectedSubject('all')
  }, [])
  const handleOpenNotifications = useCallback(() => setNotificationsOpen(true), [])
  const handleCloseNotifications = useCallback(() => setNotificationsOpen(false), [])

  const downloadRows = useMemo(
    () => downloads.map((d) => (
      <div key={d.id} className="p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
            <p className="text-xs text-muted-foreground truncate">{d.subject}</p>
          </div>
          <Badge variant="outline" className="flex-shrink-0">
            {d.fileFormat}
          </Badge>
        </div>
      </div>
    )),
    [downloads]
  )

  const notificationItems = useMemo(
    () => notifications.map((n) => (
      <NotificationItem
        key={n.id}
        title={n.title}
        description={n.message}
        timestamp={n.createdAt}
        isUnread={!n.isRead}
        onDismiss={() => markNotificationRead(n.id)}
      />
    )),
    [notifications, markNotificationRead]
  )

  const navItems = useMemo(
    () => [
      { id: 'overview', label: 'Dashboard', href: '#overview', icon: Library },
      { id: 'resources', label: 'Resources', href: '#resources', icon: BookOpen },
      { id: 'saved', label: 'Saved', href: '#personalization', icon: Bookmark },
      { id: 'downloads', label: 'Downloads', href: '#downloads', icon: Download },
      { id: 'help', label: 'Help & Support', href: '#help', icon: HelpCircle },
    ],
    []
  )

  if (loading) {
    return <StudentDashboardSkeleton />
  }

  return (
    <AppLayout
      role="student"
      userLabel={getDisplayName(user?.email, 'Student')}
      sidebarTitle="Student Workspace"
      sidebarSubtitle="Resource Hub"
      navItems={navItems}
      topbarTitle="Student Dashboard"
      topbarSubtitle="Find, track, and access your learning resources"
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      onOpenNotifications={handleOpenNotifications}
      unreadCount={unreadNotificationCount}
      onLogout={logout}
    >
      <PageContainer>
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Dashboard Overview */}
        <ContentSection
          id="overview"
          title="Dashboard Overview"
          subtitle="Quick stats about your resources"
          noPaddingBottom
        >
          <GridContainer columns={4}>
            <StatCard
              label="Total Resources"
              value={resources.length}
              trend={completedCount > uploadingCount ? 'up' : undefined}
              trendLabel={completedCount > 0 ? `${completedCount} ready` : undefined}
            />
            <StatCard
              label="Ready to View"
              value={completedCount}
              trend="up"
              trendLabel="All good"
            />
            <StatCard
              label="Uploading"
              value={uploadingCount}
              trend={uploadingCount === 0 ? undefined : undefined}
              trendLabel={uploadingCount === 0 ? undefined : 'In progress'}
            />
            <StatCard
              label="Needs Attention"
              value={failedCount}
              trend={failedCount === 0 ? undefined : undefined}
              trendLabel={failedCount === 0 ? undefined : 'Check status'}
            />
          </GridContainer>
        </ContentSection>

        {/* Resources Section */}
        <ContentSection
          id="resources"
          title="Resource Library"
          subtitle="Filter and search your learning materials"
        >
          {/* Filter Bar */}
          <ResponsiveFilterBar
            filters={filterConfig}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
          />

          {/* Resources Grid */}
          {filteredResources.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No resources found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <GridContainer columns={3}>
              {filteredResources.map((resource) => (
                <StudentResourceCard
                  key={resource.id}
                  resource={resource}
                  bookmarked={Boolean(resource.isBookmarked)}
                  onPreview={handlePreviewResource}
                  onDownload={handleResourceAction}
                  onBookmark={handleToggleBookmark}
                  onReview={handleOpenReview}
                />
              ))}
            </GridContainer>
          )}
        </ContentSection>

        {/* Collections Section */}
        {collections.length > 0 && (
          <ContentSection
            title="Collections"
            subtitle="Organized resource groups"
          >
            <CollectionManager
              collections={collections}
              onToggleSave={handleToggleCollectionSave}
            />
          </ContentSection>
        )}

        {/* Analytics Section */}
        {analyticsSummary && (
          <ContentSection
            title="Your Learning Insights"
            subtitle="Analytics and activity summary"
          >
            <AnalyticsDashboard summary={analyticsSummary} />
          </ContentSection>
        )}

        {/* Personalization Section */}
        <ContentSection
          id="personalization"
          title="Personalization"
          subtitle="Recommendations, saved searches, and notification settings"
        >
          <GridContainer columns={3}>
            <RecommendationPanel />
            <SavedSearchPanel />
            <NotificationPreferencesPanel />
          </GridContainer>
        </ContentSection>

        {/* Downloads Section */}
        {downloads.length > 0 && (
          <ContentSection
            id="downloads"
            title="Recent Downloads"
            subtitle="Your download history"
          >
            <ScrollableContainer maxHeight="max-h-[50vh] md:max-h-[60vh]">
              <div className="divide-y divide-border">{downloadRows}</div>
            </ScrollableContainer>
          </ContentSection>
        )}

        {/* Help & Support Section */}
        <ContentSection
          id="help"
          title="Help & Support"
          subtitle="Request additional resources or get help"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setRequestModalOpen(true)}
              className="flex-1"
            >
              Request Resource
            </Button>
            <Button variant="outline" className="flex-1">
              Email Support
            </Button>
          </div>
        </ContentSection>
      </PageContainer>

      {/* Resource Viewer Modal */}
      {resourceViewerOpen && (
        <ResourceViewer
          resource={previewResource}
          onClose={() => setResourceViewerOpen(false)}
        />
      )}

      {/* Request Resource Dialog */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogHeader>
          <DialogTitle>Request a Resource</DialogTitle>
          <DialogDescription>
            Let us know what resource you need and we'll try to find it for you.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Course/Class *</label>
            <Input
              value={resourceRequest.courseName}
              onChange={(e) => setResourceRequest({ ...resourceRequest, courseName: e.target.value })}
              placeholder="e.g., Mathematics 101"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Resource Title *</label>
            <Input
              value={resourceRequest.titleName}
              onChange={(e) => setResourceRequest({ ...resourceRequest, titleName: e.target.value })}
              placeholder="e.g., Calculus Workbook"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Preferred Format</label>
            <select
              value={resourceRequest.preferredFormat}
              onChange={(e) => setResourceRequest({ ...resourceRequest, preferredFormat: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Additional Details</label>
            <Textarea
              value={resourceRequest.details}
              onChange={(e) => setResourceRequest({ ...resourceRequest, details: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setRequestModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRequestSubmit} disabled={requestSubmitting}>
            {requestSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => setReviewTarget(null)}>
        <DialogHeader>
          <DialogTitle>Review: {reviewTarget?.title}</DialogTitle>
          <DialogDescription>Share your feedback on this resource</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rating (1-5 stars)</label>
            <input
              type="range"
              min="1"
              max="5"
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="w-full"
              aria-label="Rating slider"
            />
            <div className="flex gap-1 mt-2 justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={24}
                  className={i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your Comment</label>
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your thoughts about this resource..."
              rows={4}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setReviewTarget(null)}>
            Cancel
          </Button>
          <Button onClick={handleSubmitReview}>Submit Review</Button>
        </DialogFooter>
      </Dialog>

      {/* Notifications Panel */}
      <ResponsiveNotificationPanel
        isOpen={notificationsOpen}
        onClose={handleCloseNotifications}
        onMarkAllRead={readAllNotifications}
        notificationCount={notifications.length}
        unreadCount={unreadNotificationCount}
        isLoading={notificationsLoading}
      >
        {notificationItems}
      </ResponsiveNotificationPanel>
    </AppLayout>
  )
}
