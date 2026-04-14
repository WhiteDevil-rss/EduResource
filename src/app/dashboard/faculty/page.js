'use client'

import {
  AlertCircle,
  BookOpen,
  FileText,
  HelpCircle,
  Library,
  Plus,
  Shield,
  Upload,
} from 'lucide-react'
import { Suspense, lazy, memo, useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FacultyDashboardSkeleton } from '@/components/LoadingStates'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { getDisplayName } from '@/lib/demo-content'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import {
  AppLayout,
  PageContainer,
  ContentSection,
  GridContainer,
  ScrollableContainer,
  StatCard,
  ResourceCard,
  ResponsiveFilterBar,
  ResponsiveNotificationPanel,
  NotificationItem,
  StandardCard,
} from '@/components/layout'

const LazyAnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard })))
const LazyResourceViewer = lazy(() => import('@/components/ResourceViewer').then((module) => ({ default: module.ResourceViewer })))
const LazyCollectionManager = lazy(() => import('@/components/CollectionManager').then((module) => ({ default: module.CollectionManager })))
const LazyUploadDropzone = lazy(() => import('@/components/faculty/UploadDropzone').then((module) => ({ default: module.UploadDropzone })))

function PanelSkeleton({ minHeight = 'min-h-[220px]' }) {
  return (
    <div className={`w-full ${minHeight} rounded-xl border border-border/40 bg-card/40 p-6 animate-pulse`} />
  )
}

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
    <ResourceCard
      resource={resource}
      isAdmin={true}
      onEdit={() => onEdit(resource)}
      onDelete={() => onDelete(resource)}
      onClick={() => onView(resource)}
    />
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
  const [, setCollectionModalOpen] = useState(false)

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
        if (!response.ok) throw new Error(payload?.error || 'Failed to load resources.')
        if (isActive) {
          setResources(payload?.resources || [])
          setErrorMessage('')
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          setResources([])
          setErrorMessage(error.message || 'The resource library is currently offline.')
        }
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadResources()
    return () => { isActive = false; controller.abort() }
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
        if (isActive && response.ok) {
          setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) setNotifications([])
      } finally {
        if (isActive) setNotificationsLoading(false)
      }
    }

    loadNotifications()
    return () => { isActive = false; controller.abort() }
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
      }
    }

    load()
    return () => { isActive = false; controller.abort() }
  }, [user?.uid])

  // Handlers
  const handleFileSelection = useCallback((files) => {
    const newJobs = files.map((file) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      progress: 0,
      status: 'uploading',
      timestamp: new Date().toLocaleTimeString(),
    }))
    setUploadJobs((current) => [...newJobs, ...current])

    // Simulate progression for new jobs
    newJobs.forEach((job) => {
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += Math.random() * 30
        if (currentProgress >= 100) {
          currentProgress = 100
          clearInterval(interval)
          setUploadJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, progress: 100, status: 'done' } : j))
          )
        } else {
          setUploadJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, progress: Math.floor(currentProgress) } : j))
          )
        }
      }, 400 + Math.random() * 1000)
    })
  }, [])

  const clearDoneJobs = useCallback(() => {
    setUploadJobs((current) => current.filter((job) => job.status !== 'done'))
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
      if (!response.ok) throw new Error(payload?.error || 'Failed to save changes.')

      if (draft.id) {
        setResources((current) => current.map((r) => (r.id === draft.id ? payload.resource : r)))
        toast.success('Resource updated successfully.')
      } else {
        setResources((current) => [payload.resource, ...current])
        toast.success('Resource published successfully.')
      }

      setEditorOpen(false)
      setDraft(EMPTY_DRAFT)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteResource = async () => {
    if (!deleteTarget?.id) return
    try {
      const response = await fetch(`/api/faculty/resources/${deleteTarget.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete resource.')
      setResources((current) => current.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Resource removed from library.')
    } catch (error) {
      toast.error(error.message)
    }
  }

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
        toast.success('Alert feed cleared')
      }
    } catch {
      toast.error('Sync failed')
    }
  }, [])

  // Collections
  // Derived values
  const classOptions = useMemo(() => ['all', ...new Set(resources.map((r) => r.class).filter(Boolean))], [resources])
  const subjectOptions = useMemo(() => ['all', ...new Set(resources.map((r) => r.subject).filter(Boolean))], [resources])

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

  const activeUploadCount = useMemo(() => uploadJobs.filter((job) => job.status === 'uploading').length, [uploadJobs])

  const filterConfig = useMemo(() => [
    { id: 'search', type: 'search', label: 'Search Resources', placeholder: 'Search resources...', value: searchInput },
    {
      id: 'class',
      type: 'select',
      label: 'Class',
      value: selectedClass,
      options: classOptions.map(c => ({ label: c === 'all' ? 'All Classes' : c, value: c }))
    },
    {
      id: 'subject',
      type: 'select',
      label: 'Subject',
      value: selectedSubject,
      options: subjectOptions.map(s => ({ label: s === 'all' ? 'All Subjects' : s, value: s }))
    },
  ], [searchInput, selectedClass, selectedSubject, classOptions, subjectOptions])

  if (loading) return <FacultyDashboardSkeleton />

  const facultyNavSections = [
    {
      label: 'Publishing',
      items: [
        { id: 'overview', label: 'Dashboard', href: '#overview', icon: Library },
        { id: 'publications', label: 'Resources', href: '#publications', icon: BookOpen },
        { id: 'uploads', label: 'Upload Files', href: '#uploads', icon: Upload },
      ],
    },
    {
      label: 'Collaboration',
      items: [
        { id: 'collections', label: 'Collections', href: '#collections', icon: FileText },
        { id: 'reviews', label: 'Reviews', href: '#reviews', icon: Shield },
        { id: 'help', label: 'Help & Support', href: '#help', icon: HelpCircle },
      ],
    },
  ]

  return (
    <AppLayout
      role="faculty"
      userLabel={getDisplayName(user?.email, 'Faculty Member')}
      sidebarTitle="EDUCATIONAM"
      sidebarSubtitle="Faculty Workspace"
      navSections={facultyNavSections}
      navItems={[
        { id: 'overview', label: 'Dashboard', href: '#overview', icon: Library },
        { id: 'publications', label: 'Resources', href: '#publications', icon: BookOpen },
        { id: 'uploads', label: 'Upload Files', href: '#uploads', icon: Upload },
        { id: 'collections', label: 'Collections', href: '#collections', icon: FileText },
        { id: 'reviews', label: 'Reviews', href: '#reviews', icon: Shield },
        { id: 'help', label: 'Help & Support', href: '#help', icon: HelpCircle },
      ]}
      topbarTitle="Faculty Center"
      topbarSubtitle="Manage and publish your academic resources"
      onOpenNotifications={() => setNotificationsOpen(true)}
      unreadCount={notifications.filter(n => !n.isRead).length}
      onLogout={logout}
    >
      <PageContainer>
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/15 bg-danger/10 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-sm font-medium text-danger">{errorMessage}</p>
          </div>
        )}

        <StandardCard className="mb-6 overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Faculty workspace
              </p>
              <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                Publish faster, monitor engagement, and keep your academic catalog organized.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                The faculty panel now centers the publishing workflow with a calmer resource registry, cleaner upload
                queue, and a more focused analytics surface.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:w-[280px]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
                <p className="mt-2 text-2xl font-semibold">{resources.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Uploads</p>
                <p className="mt-2 text-2xl font-semibold">{activeUploadCount}</p>
              </div>
            </div>
          </div>
        </StandardCard>

        <ContentSection id="overview" title="System Overview" subtitle="Key publishing metrics and recent activity" noPaddingBottom>
          <GridContainer columns={4}>
            <StatCard label="Total Resources" value={resources.length} icon={BookOpen} color="primary" trend="up" trendLabel="+12%" />
            <StatCard label="Collections" value={collections.length} icon={Library} color="info" />
            <StatCard label="Active Uploads" value={activeUploadCount} icon={Upload} color="warning" />
            <StatCard label="Unread Alerts" value={notifications.filter(n => !n.isRead).length} icon={AlertCircle} color="error" />
          </GridContainer>
        </ContentSection>

        {analyticsSummary && (
          <ContentSection title="Engagement Analytics" subtitle="Track how students interact with your published content">
            <Suspense fallback={<PanelSkeleton minHeight="min-h-[360px]" />}>
              <LazyAnalyticsDashboard summary={analyticsSummary} />
            </Suspense>
          </ContentSection>
        )}

        <ContentSection
          id="publications"
          title="Resource Catalog"
          subtitle="Manage your published academic materials with faster filters and cleaner cards"
          actions={
            <Button onClick={openCreateModal} className="h-10 px-4 rounded-lg bg-primary text-white font-semibold text-sm">
              <Plus size={16} className="mr-2" />
              New Resource
            </Button>
          }
        >
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
              <div className="py-24 text-center rounded-xl border border-dashed border-border/60 bg-muted/5">
                <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground/20" />
                <h3 className="text-sm font-semibold text-foreground">No resources found</h3>
                <p className="mt-1 text-xs text-muted-foreground">Adjust your filters or publish a new resource.</p>
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
          </div>
        </ContentSection>

        <ContentSection id="uploads" title="Upload Center" subtitle="Securely upload and process your library files">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Suspense fallback={<PanelSkeleton minHeight="min-h-[280px]" />}>
                <LazyUploadDropzone onFileSelect={handleFileSelection} />
              </Suspense>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60">Active Queue</h4>
                {uploadJobs.some(j => j.status === 'done') && (
                  <button
                    onClick={clearDoneJobs}
                    className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear Finished
                  </button>
                )}
              </div>
              <StandardCard className="p-0 overflow-hidden min-h-[300px] border-border/40 bg-card/30">
                {uploadJobs.length > 0 ? (
                  <ScrollableContainer maxHeight="max-h-[400px]">
                    <div className="divide-y divide-border/20">
                      {uploadJobs.map(job => (
                        <div key={job.id} className="p-4 hover:bg-muted/30 transition-colors group relative">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{job.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground">{job.size}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[10px] text-muted-foreground">{job.timestamp}</span>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold break-words",
                              job.status === 'done' ? "text-emerald-500" : "text-primary"
                            )}>
                              {job.status === 'done' ? 'Success' : `${job.progress}%`}
                            </span>
                          </div>

                          <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "absolute left-0 top-0 h-full transition-all duration-300 ease-out rounded-full",
                                job.status === 'done' ? "bg-emerald-500" : "bg-primary"
                              )}
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollableContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px] opacity-40">
                    <div className="w-12 h-12 rounded-xl border border-dashed border-foreground/20 flex items-center justify-center mb-4">
                      <Upload size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Queue Empty</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Files you upload will appear here.</p>
                  </div>
                )}
              </StandardCard>
            </div>
          </div>
        </ContentSection>

        <ContentSection
          id="collections"
          title="Collections"
          subtitle="Group resources for better organization"
          actions={
            <button onClick={() => setCollectionModalOpen(true)} className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-strong transition-colors">
              <Plus size={14} />
              Create Collection
            </button>
          }
        >
          <Suspense fallback={<PanelSkeleton minHeight="min-h-[260px]" />}>
            <LazyCollectionManager collections={collections} />
          </Suspense>
        </ContentSection>

        <ContentSection id="help" title="Resources" subtitle="Guidance and support for better publishing workflows">
          <GridContainer columns={3}>
            <StandardCard className="border-border/40 hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary mb-4 border border-primary/10">
                <FileText size={18} />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Publishing Guide</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Learn how to upload and categorize your academic materials for maximum reach.</p>
            </StandardCard>
            <StandardCard className="border-border/40 hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary mb-4 border border-primary/10">
                <Library size={18} />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Content Strategy</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Organize your resources into collections to help students follow structured paths.</p>
            </StandardCard>
            <StandardCard className="border-border/40 hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary mb-4 border border-primary/10">
                <HelpCircle size={18} />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Get Support</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Need help with the platform? Our technical support team is here to assist you.</p>
            </StandardCard>
          </GridContainer>
        </ContentSection>
      </PageContainer>

      {/* Resource Viewer & Editor: MODAL_OVERLAYS */}
      {resourceViewerOpen && (
        <Suspense fallback={<PanelSkeleton minHeight="min-h-[320px]" />}>
          <LazyResourceViewer resource={previewResource} onClose={() => setResourceViewerOpen(false)} />
        </Suspense>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogHeader className="p-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-lg font-semibold text-foreground">{draft.id ? 'Edit Resource' : 'New Resource'}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Configure the details for your academic material</DialogDescription>
        </DialogHeader>
        <DialogBody className="p-6 py-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Title</label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Enter resource title" className="h-10 rounded-lg border-border/40 bg-muted/20 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Subject</label>
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Chemistry, Math, etc." className="h-10 rounded-lg border-border/40 bg-muted/20 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Class</label>
            <Input value={draft.class} onChange={(e) => setDraft({ ...draft, class: e.target.value })} placeholder="Class 10, Batch B, etc." className="h-10 rounded-lg border-border/40 bg-muted/20 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/60 ml-1">Description</label>
            <Textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Briefly describe what this resource is about..." rows={4} className="rounded-lg border-border/40 bg-muted/20 text-sm" />
          </div>
        </DialogBody>
        <DialogFooter className="p-6 pt-4 border-t border-border/40 flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-lg text-sm font-medium" onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button className="flex-[2] rounded-lg text-sm font-bold bg-primary text-white" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Resource'}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Resource"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteResource}
        onCancel={() => setDeleteTarget(null)}
      />

      <ResponsiveNotificationPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notificationCount={notifications.length}
        unreadCount={notifications.filter(n => !n.isRead).length}
        onMarkAllRead={readAllNotifications}
        isLoading={notificationsLoading}
      >
        {notifications.map((n) => (
          <NotificationItem key={n.id} title={n.title} description={n.message} timestamp={n.createdAt} isUnread={!n.isRead} />
        ))}
      </ResponsiveNotificationPanel>
    </AppLayout>
  )
}
