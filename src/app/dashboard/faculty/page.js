'use client'

import {
  AlertCircle,
  BookOpen,
  Edit3,
  FileText,
  HelpCircle,
  Library,
  Plus,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FacultyDashboardSkeleton } from '@/components/LoadingStates'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayName } from '@/lib/demo-content'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { ResourceViewer } from '@/components/ResourceViewer'
import { CollectionManager } from '@/components/CollectionManager'
import { UploadDropzone } from '@/components/faculty/UploadDropzone'

const EMPTY_DRAFT = {
  title: '',
  subject: '',
  class: '',
  summary: '',
  fileUrl: '',
}

const FacultyResourceCard = memo(function FacultyResourceCard({
  resource,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {resource.class} • {resource.subject}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex-shrink-0">
            {resource.uploadStatus === 'completed' ? 'Live' : 'Draft'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{resource.summary}</p>
      </CardContent>
      <div className="px-6 py-3 border-t border-border flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(resource)}>
          View
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(resource)}>
          <Edit3 size={14} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(resource)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  )
})

export default function FacultyDashboard() {
  const { user, logout } = useAuth()

  // State
  const [resources, setResources] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [uploadJobs, setUploadJobs] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [previewResource, setPreviewResource] = useState(null)
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false)
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [collections, setCollections] = useState([])
  const [, setAnalyticsLoading] = useState(false)
  const [, setCollectionsLoading] = useState(false)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [collectionTitle, setCollectionTitle] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')

  const debouncedSearchInput = useDebouncedSearch(searchInput, 500)

  // Load resources
  useEffect(() => {
    if (!user?.uid) return
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadResources = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/faculty/resources', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load resources.')
        }
        if (isActive) {
          setResources(payload?.resources || [])
          setErrorMessage('')
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          console.error('Faculty resources error:', error)
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
          setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          console.error('Notifications error:', error)
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

  // Load analytics and collections
  useEffect(() => {
    if (!user?.uid) return
    const controller = new globalThis.AbortController()
    let isActive = true

    const load = async () => {
      try {
        const [analyticsRes, collectionsRes] = await Promise.all([
          fetch('/api/analytics/summary', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/collections', { cache: 'no-store', signal: controller.signal }),
        ])

        if (isActive && analyticsRes.ok) {
          const payload = await analyticsRes.json().catch(() => ({}))
          setAnalyticsSummary(payload?.summary || null)
        }

        if (isActive && collectionsRes.ok) {
          const payload = await collectionsRes.json().catch(() => ({}))
          setCollections(Array.isArray(payload?.collections) ? payload.collections : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        console.error('Load error:', error)
      } finally {
        if (isActive) {
          setAnalyticsLoading(false)
          setCollectionsLoading(false)
        }
      }
    }

    load()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [user?.uid])

  // Event handlers
  const handleFileSelection = useCallback((files) => {
    const newJobs = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      progress: 0,
      status: 'uploading',
    }))
    setUploadJobs((current) => [...current, ...newJobs])
    // Simulate upload progress
    newJobs.forEach((job) => {
      setTimeout(() => {
        setUploadJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, progress: 100, status: 'done' } : j))
        )
      }, 2000)
    })
  }, [])

  const handlePreviewResource = useCallback((resource) => {
    setPreviewResource(resource)
    setResourceViewerOpen(true)
  }, [])

  const handleEditResource = useCallback((resource) => {
    setDraft(resource)
    setEditorOpen(true)
  }, [])

  const handleDeleteClick = useCallback((resource) => {
    setDeleteTarget(resource)
  }, [])

  const openCreateModal = useCallback(() => {
    setDraft(EMPTY_DRAFT)
    setEditorOpen(true)
  }, [])

  const handleSave = async () => {
    if (!draft.title || !draft.subject || !draft.class) {
      toast.error('Please fill in all required fields.')
      return
    }

    setIsSaving(true)
    try {
      const url = draft.id ? `/api/faculty/resources/${draft.id}` : '/api/faculty/resources'
      const method = draft.id ? 'PATCH' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save resource.')
      }

      if (draft.id) {
        setResources((current) =>
          current.map((r) => (r.id === draft.id ? payload.resource : r))
        )
        toast.success('Resource updated.')
      } else {
        setResources((current) => [payload.resource, ...current])
        toast.success('Resource created.')
      }

      setEditorOpen(false)
      setDraft(EMPTY_DRAFT)
    } catch (error) {
      toast.error(error.message || 'Could not save resource.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteResource = async () => {
    if (!deleteTarget?.id) return

    try {
      const response = await fetch(`/api/faculty/resources/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete resource.')
      }

      setResources((current) => current.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Resource deleted.')
    } catch (error) {
      toast.error(error.message || 'Could not delete resource.')
    }
  }

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

  const handleCreateCollection = async () => {
    if (!collectionTitle) {
      toast.error('Please enter a collection title.')
      return
    }

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: collectionTitle,
          description: collectionDescription,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not create collection.')
      }

      setCollections((current) => [payload.collection, ...current])
      setCollectionTitle('')
      setCollectionDescription('')
      setCollectionModalOpen(false)
      toast.success('Collection created.')
    } catch (error) {
      toast.error(error.message || 'Could not create collection.')
    }
  }

  // Derived values
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

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )
  const activeUploadCount = useMemo(
    () => uploadJobs.filter((job) => job.status === 'uploading').length,
    [uploadJobs]
  )

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

  const uploadRows = useMemo(
    () => uploadJobs.map((job) => (
      <div key={job.id} className="p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-medium text-foreground truncate">{job.name}</p>
          <Badge variant="outline" className="text-xs">
            {job.status === 'done' ? 'Complete' : `${job.progress}%`}
          </Badge>
        </div>
        <Progress value={job.progress} className="h-2" />
      </div>
    )),
    [uploadJobs]
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
      { id: 'publications', label: 'Publications', href: '#publications', icon: BookOpen },
      { id: 'uploads', label: 'Uploads', href: '#uploads', icon: Upload },
      { id: 'collections', label: 'Collections', href: '#collections', icon: FileText },
      { id: 'reviews', label: 'Reviews', href: '#reviews', icon: Shield },
      { id: 'help', label: 'Help', href: '#help', icon: HelpCircle },
    ],
    []
  )

  if (loading) {
    return <FacultyDashboardSkeleton />
  }

  return (
    <AppLayout
      role="faculty"
      userLabel={getDisplayName(user?.email, 'Faculty')}
      sidebarTitle="Faculty Workspace"
      sidebarSubtitle="Content Management"
      navItems={navItems}
      topbarTitle="Faculty Dashboard"
      topbarSubtitle="Create, manage, and publish your learning resources"
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

        {/* Overview */}
        <ContentSection
          id="overview"
          title="Dashboard Overview"
          subtitle="Quick stats and analytics"
          noPaddingBottom
        >
          <GridContainer columns={4}>
            <StatCard label="Total Resources" value={resources.length} />
            <StatCard label="Collections" value={collections.length} />
            <StatCard label="Active Uploads" value={activeUploadCount} />
            <StatCard label="Notifications" value={unreadNotificationCount} />
          </GridContainer>
        </ContentSection>

        {/* Analytics */}
        {analyticsSummary && (
          <ContentSection
            title="Learning Analytics"
            subtitle="Resource usage and engagement"
          >
            <AnalyticsDashboard summary={analyticsSummary} />
          </ContentSection>
        )}

        {/* Publications */}
        <ContentSection
          id="publications"
          title="My Publications"
          subtitle="Manage your published resources"
          actions={
            <Button onClick={openCreateModal} className="gap-2">
              <Plus size={16} />
              Create Resource
            </Button>
          }
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
              <p className="text-xs text-muted-foreground mb-6">Create your first resource to get started</p>
              <Button onClick={openCreateModal}>Create Resource</Button>
            </div>
          ) : (
            <GridContainer columns={3}>
              {filteredResources.map((resource) => (
                <FacultyResourceCard
                  key={resource.id}
                  resource={resource}
                  onView={handlePreviewResource}
                  onEdit={handleEditResource}
                  onDelete={handleDeleteClick}
                />
              ))}
            </GridContainer>
          )}
        </ContentSection>

        {/* Uploads */}
        <ContentSection
          id="uploads"
          title="Uploads"
          subtitle="Manage your file uploads"
        >
          <UploadDropzone onFileSelect={handleFileSelection} />

          {uploadJobs.length > 0 && (
            <ScrollableContainer maxHeight="max-h-[40vh]">
              <div className="divide-y divide-border">{uploadRows}</div>
            </ScrollableContainer>
          )}
        </ContentSection>

        {/* Collections */}
        {collections.length > 0 && (
          <ContentSection
            id="collections"
            title="Collections"
            subtitle="Organized resource groups"
            actions={
              <Button onClick={() => setCollectionModalOpen(true)} size="sm" className="gap-2">
                <Plus size={14} />
                New Collection
              </Button>
            }
          >
            <CollectionManager collections={collections} />
          </ContentSection>
        )}

        {/* Help & Support */}
        <ContentSection
          id="help"
          title="Help & Support"
          subtitle="Resources and documentation"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Learn about supported file formats and best practices.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Quick start guide for creating your first resource.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get help from our support team.
                </p>
              </CardContent>
            </Card>
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

      {/* Resource Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogHeader>
          <DialogTitle>{draft.id ? 'Edit Resource' : 'Create Resource'}</DialogTitle>
          <DialogDescription>
            {draft.id ? 'Update your resource details' : 'Add a new learning resource'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Resource title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Class *</label>
              <Input
                value={draft.class}
                onChange={(e) => setDraft({ ...draft, class: e.target.value })}
                placeholder="e.g., CORE 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject *</label>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Summary</label>
            <Textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              placeholder="Describe your resource..."
              rows={4}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setEditorOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Resource'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Collection Modal */}
      <Dialog open={collectionModalOpen} onOpenChange={setCollectionModalOpen}>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
          <DialogDescription>Create a new collection to organize your resources</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              value={collectionTitle}
              onChange={(e) => setCollectionTitle(e.target.value)}
              placeholder="Collection title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={collectionDescription}
              onChange={(e) => setCollectionDescription(e.target.value)}
              placeholder="Describe this collection..."
              rows={3}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setCollectionModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateCollection}>Create Collection</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Resource"
          description={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={handleDeleteResource}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

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
