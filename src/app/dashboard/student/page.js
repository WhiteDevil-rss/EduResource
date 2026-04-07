'use client'

import {
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Download,
  Filter,
  HelpCircle,
  Inbox,
  Library,
  Send,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { StudentDashboardSkeleton } from '@/components/LoadingStates'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'
import { StudentResourceCard } from '@/components/student/StudentResourceCard'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'

const DOWNLOADS_STORAGE_KEY = 'sps.educationam.downloads.v1'

function inferResourceFormat(fileUrl) {
  const value = String(fileUrl || '').toLowerCase()
  if (value.endsWith('.mp4') || value.endsWith('.mov')) {
    return { format: 'Video', size: '45m', isPlayable: true }
  }
  if (value.endsWith('.zip')) {
    return { format: 'ZIP', size: '256MB', isPlayable: false }
  }
  if (value.endsWith('.pdf')) {
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
    : safeProgress > 0 && safeProgress < 100
      ? 'uploading'
      : 'completed'
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
    ...inferred,
  }
}

function loadDownloadsFromStorage() {
  try {
    const raw = window.localStorage.getItem(DOWNLOADS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const [resources, setResources] = useState([])
  const [downloads, setDownloads] = useState([])
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [resourceRequest, setResourceRequest] = useState({
    courseName: '',
    titleName: '',
    preferredFormat: '',
    details: '',
  })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsError, setNotificationsError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('All Classes')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const notificationsPanelRef = useRef(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchTerm(searchInput)
    }, 220)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchInput])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDownloads(loadDownloadsFromStorage())
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadResources = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/student/resources', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load the student catalog.')
        }

        if (!isActive) {
          return
        }

        setResources(
          Array.isArray(payload?.resources)
            ? payload.resources.map(normalizeStudentResource)
            : []
        )
        setErrorMessage('')
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error('Student catalog error:', error)
        setResources([])
        setErrorMessage(error.message || 'Could not load the student catalog.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadResources()

    return () => {
      isActive = false
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    let isActive = true

    const loadNotifications = async () => {
      setNotificationsLoading(true)
      try {
        const response = await fetch('/api/student/notifications', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load notifications.')
        }

        if (!isActive) {
          return
        }

        setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
        setNotificationsError('')
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error('Student notifications error:', error)
        setNotifications([])
        setNotificationsError(error.message || 'Could not load notifications.')
      } finally {
        if (isActive) {
          setNotificationsLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      isActive = false
    }
  }, [user?.uid])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationsOpen) {
        return
      }

      if (notificationsPanelRef.current && !notificationsPanelRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [notificationsOpen])

  const catalog = resources
  const classOptions = useMemo(
    () => ['All Classes', ...new Set(catalog.map((entry) => entry.class))],
    [catalog]
  )
  const subjectOptions = useMemo(
    () => ['All Subjects', ...new Set(catalog.map((entry) => entry.subject))],
    [catalog]
  )
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length

  const filteredResources = catalog.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.title, entry.subject, entry.class, entry.summary, entry.facultyName, entry.facultyEmail]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesSubject =
      !selectedSubject || selectedSubject === 'All Subjects' || entry.subject === selectedSubject

    const matchesClass =
      !selectedClass || selectedClass === 'All Classes' || entry.class === selectedClass

    return matchesSearch && matchesSubject && matchesClass
  })

  const persistDownloads = (entries) => {
    setDownloads(entries)
    try {
      window.localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(entries))
    } catch {
      toast.error('Downloads could not be saved locally on this device.')
    }
  }

  const openNotifications = () => {
    setNotificationsOpen((current) => !current)
  }

  const openRequestModal = () => {
    setResourceRequest({
      courseName: '',
      titleName: '',
      preferredFormat: '',
      details: '',
    })
    setRequestModalOpen(true)
  }

  const closeRequestModal = () => {
    setRequestModalOpen(false)
  }

  const handleRequestSubmit = async (event) => {
    event?.preventDefault?.()
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
    } catch (error) {
      toast.error(error.message || 'Could not submit the request.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const markNotificationRead = async (notificationId) => {
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
  }

  const readAllNotifications = async () => {
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
  }

  const handleResourceAction = (entry) => {
    if (entry.uploadStatus === 'uploading') {
      toast.error('This resource is still uploading.')
      return
    }

    const nextDownloads = [
      {
        id: entry.id,
        title: entry.title,
        subject: entry.subject,
        fileUrl: entry.fileUrl,
        fileType: entry.fileType || entry.type || '',
        fileSize: entry.fileSize || entry.size || 0,
        fileFormat: entry.fileFormat || entry.format || '',
        downloadedAt: new Date().toISOString(),
      },
      ...downloads.filter((download) => download.id !== entry.id),
    ].slice(0, 6)

    persistDownloads(nextDownloads)
    toast.success(`${entry.title} added to your downloads.`)

    if (typeof window !== 'undefined') {
      window.open(`/api/student/resources/${entry.id}/download`, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return <StudentDashboardSkeleton />
  }

  const completedCount = catalog.filter((entry) => entry.uploadStatus === 'completed').length
  const uploadingCount = catalog.filter((entry) => entry.uploadStatus === 'uploading').length
  const failedCount = catalog.filter((entry) => entry.uploadStatus === 'failed').length

  return (
    <div className="student-panel">
      <DashboardSidebar
        role="student"
        title="Student Workspace"
        subtitle="Resource Hub"
        navItems={[
          { id: 'overview', label: 'Dashboard', href: '#student-overview', icon: Library },
          { id: 'resources', label: 'Resources', href: '#student-resources', icon: BookOpen },
          { id: 'downloads', label: 'Downloads', href: '#student-downloads', icon: Download },
          { id: 'profile', label: 'Profile', href: '#student-profile', icon: Inbox },
          { id: 'support', label: 'Help & Support', href: '#student-support', icon: HelpCircle },
        ]}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={logout}
      />

      <div className="student-panel__main">
        <DashboardTopbar
          role="student"
          title="Student Dashboard"
          subtitle="Find, track, and access your learning resources"
          onOpenMenu={() => setMobileNavOpen(true)}
          onOpenNotifications={openNotifications}
          unreadCount={unreadNotificationCount}
          userLabel={getDisplayName(user?.email, 'Student')}
        />

        <main className="student-panel__content p-4 md:p-6 flex flex-col gap-6 md:gap-8">
          {notificationsOpen ? (
            <div className="student-notification-panel-wrap" ref={notificationsPanelRef}>
              <Card className="student-notification-panel w-full max-w-md max-h-[50vh] flex flex-col" role="dialog" aria-label="Notifications center">
              <CardHeader className="shrink-0 p-5">
                <CardTitle>Notifications</CardTitle>
                <CardDescription>{unreadNotificationCount} unread update(s)</CardDescription>
              </CardHeader>
              <CardContent className="student-notification-list flex-1 overflow-y-auto p-5 pt-0 custom-scrollbar">
                {notificationsError ? (
                  <div className="student-inline-message student-inline-message--error">
                    <HelpCircle size={16} />
                    <span>{notificationsError}</span>
                  </div>
                ) : null}

                {notificationsLoading ? <p>Syncing updates...</p> : null}
                {!notificationsLoading && notifications.length === 0 ? <p>Your inbox is currently clear.</p> : null}
                {!notificationsLoading && notifications.length > 0
                  ? notifications.slice(0, 5).map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className="student-notification-item"
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        <div>
                          <strong>{notification.resourceTitle || 'New resource uploaded'}</strong>
                          <p>{notification.message || 'A faculty member uploaded a new learning resource.'}</p>
                          <span>
                            {notification.facultyName || notification.facultyEmail || 'Faculty'}
                            {' · '}
                            {formatRelativeUpdate(notification.createdAt)}
                          </span>
                        </div>
                        {!notification.readAt ? <Badge>New</Badge> : <Badge variant="outline">Read</Badge>}
                      </button>
                    ))
                  : null}
                <div className="student-notification-actions mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={readAllNotifications}
                    disabled={notificationsSaving || unreadNotificationCount === 0}
                  >
                    <CheckCircle2 size={14} className="mr-2" />
                    {notificationsSaving ? 'Updating...' : 'Mark all as read'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setNotificationsOpen(false)}>
                    <X size={14} className="mr-2" />
                    Close
                  </Button>
                </div>
              </CardContent>
              </Card>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="student-inline-message student-inline-message--error" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <section id="student-overview" className="student-section flex flex-col gap-4" aria-label="Dashboard overview">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Overview</h2>
                <p className="text-muted-foreground text-sm">Your central space to discover and download academic resources.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Total Resources</CardDescription>
                  <CardTitle>{catalog.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Ready to Download</CardDescription>
                  <CardTitle>{completedCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Uploading</CardDescription>
                  <CardTitle>{uploadingCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Needs Attention</CardDescription>
                  <CardTitle>{failedCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          <section id="student-resources" className="student-section flex flex-col gap-4" aria-label="Resource library">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Resource Library</h2>
                <p className="text-muted-foreground text-sm">Filter by class and subject to quickly find what you need.</p>
              </div>
            </div>

            <Card className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-end">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 hidden xl:flex">
                  <Filter size={16} /><span>Filters</span>
                </div>
                <div className="md:col-span-2 xl:col-span-2">
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by title, class, subject..."
                    aria-label="Search publications"
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    className="ui-input flex-1"
                    value={selectedClass}
                    onChange={(event) => setSelectedClass(event.target.value)}
                    aria-label="Filter resources by class"
                  >
                    {classOptions.map((courseClass) => (
                      <option key={courseClass} value={courseClass}>
                        {courseClass}
                      </option>
                    ))}
                  </select>
                  <select
                    className="ui-input flex-1"
                    value={selectedSubject}
                    onChange={(event) => setSelectedSubject(event.target.value)}
                    aria-label="Filter resources by subject"
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 xl:col-span-2 flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                    {filteredResources.length} items
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSearchTerm(searchInput)}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setSelectedClass('All Classes')
                      setSelectedSubject('All Subjects')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </Card>

            {catalog.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground" role="status" aria-live="polite">
                <Inbox size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No resources available yet</h3>
                <p>Resources published by faculty will appear here when available.</p>
              </Card>
            ) : null}

            {catalog.length > 0 && filteredResources.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground" role="status" aria-live="polite">
                <Library size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No results found</h3>
                <p className="mb-4">Try a different search term or reset your selected filters.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchInput('')
                    setSearchTerm('')
                    setSelectedClass('All Classes')
                    setSelectedSubject('All Subjects')
                  }}
                >
                  Reset filters
                </Button>
              </Card>
            ) : null}

            {filteredResources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredResources.map((entry) => (
                  <StudentResourceCard key={entry.id} entry={entry} onDownload={handleResourceAction} />
                ))}
              </div>
            ) : null}
          </section>

          <section id="student-downloads" className="student-section flex flex-col gap-4" aria-label="Recent downloads">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">My Downloads</h2>
                <p className="text-muted-foreground text-sm">Recently opened files from this device.</p>
              </div>
            </div>

            <Card className="max-h-[50vh] flex flex-col">
              <CardContent className="student-download-list flex-1 overflow-y-auto p-5 custom-scrollbar">
                {downloads.length > 0 ? (
                  downloads.map((entry) => (
                    <div key={entry.id} className="student-download-item flex flex-col sm:flex-row sm:justify-between sm:items-center items-start py-3 border-b border-border last:border-0 gap-4">
                      <div className="flex-1 min-w-0">
                        <strong className="block text-sm font-medium line-clamp-1" title={entry.title}>{entry.title || 'Untitled resource'}</strong>
                        <p className="text-xs text-muted-foreground mt-1">{entry.subject || 'General'}</p>
                      </div>
                      <a href={`/api/student/resources/${entry.id}/download`} target="_blank" rel="noreferrer" className="shrink-0">
                        <Button type="button" variant="secondary" size="sm">
                          <Download size={14} className="mr-2" />
                          Open
                        </Button>
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                    <p>Your downloads will appear after you open a resource.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="student-profile" className="student-section flex flex-col gap-4" aria-label="Profile details">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="text-muted-foreground text-sm">Account and authentication details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Email</CardDescription>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <Mail size={16} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{user?.email || 'student@spseducationam.edu'}</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Role</CardDescription>
                  <CardTitle className="inline-flex items-center gap-2">
                    <UserRound size={16} />
                    Student
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Authentication</CardDescription>
                  <CardTitle className="inline-flex items-center gap-2">
                    <ShieldCheck size={16} />
                    Google OAuth
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          <section id="student-support" className="student-section flex flex-col gap-4" aria-label="Help and support">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Help and Requests</h2>
              <p className="text-muted-foreground text-sm">Need specific materials? Submit a request for faculty review.</p>
            </div>

            <Card>
              <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Request a resource</h3>
                  <p className="text-sm text-muted-foreground mt-1">Include course code, topic, preferred format, and details for faster turnaround.</p>
                </div>
                <Button type="button" onClick={openRequestModal} className="shrink-0 w-full sm:w-auto">
                  <BookOpen size={16} className="mr-2" />
                  Request resource
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen} labelledBy="resource-request-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="resource-request-title">Academic Support Request</DialogTitle>
          <DialogDescription>
            Our academic teams review requests and usually respond within 48-72 business hours.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className="student-request-form" onSubmit={handleRequestSubmit}>
            <label>
              <span>Authorized account</span>
              <Input value={user?.email || 'Authenticated student'} disabled />
            </label>
            <label>
              <span>Reference code or course</span>
              <Input
                value={resourceRequest.courseName}
                onChange={(event) => setResourceRequest((current) => ({ ...current, courseName: event.target.value }))}
                placeholder="e.g. CS-402"
                required
              />
            </label>
            <label>
              <span>Topic or title</span>
              <Input
                value={resourceRequest.titleName}
                onChange={(event) => setResourceRequest((current) => ({ ...current, titleName: event.target.value }))}
                placeholder="e.g. Memory Management"
                required
              />
            </label>
            <label>
              <span>Target format</span>
              <Input
                value={resourceRequest.preferredFormat}
                onChange={(event) => setResourceRequest((current) => ({ ...current, preferredFormat: event.target.value }))}
                placeholder="PDF, Video, PPTX"
                required
              />
            </label>
            <label>
              <span>Specific requirements</span>
              <Textarea
                rows={3}
                value={resourceRequest.details}
                onChange={(event) => setResourceRequest((current) => ({ ...current, details: event.target.value }))}
                placeholder="Mention chapters or page ranges"
              />
            </label>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeRequestModal}>
            Cancel
          </Button>
          <Button type="button" onClick={handleRequestSubmit} disabled={requestSubmitting}>
            <Send size={14} />
            {requestSubmitting ? 'Submitting...' : 'Submit request'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
