'use client'

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Edit3,
  FileText,
  HelpCircle,
  Inbox,
  Library,
  Mail,
  RotateCcw,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  EllipsisVertical,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FacultyDashboardSkeleton } from '@/components/LoadingStates'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'
import { AlertDialog } from '@/components/ui/alert-dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { formatDisplayDate, formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'

const EMPTY_DRAFT = {
  id: null,
  title: '',
  class: '',
  subject: '',
  fileUrl: '',
  summary: '',
  status: 'live',
  file: null,
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export default function FacultyDashboard() {
  const { user, logout } = useAuth()
  const [resources, setResources] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [totalDownloads, setTotalDownloads] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [uploadJobs, setUploadJobs] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [requestSearchInput, setRequestSearchInput] = useState('')
  const [requestSearchTerm, setRequestSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('All Classes')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const notificationsPanelRef = useRef(null)
  const uploadLockRef = useRef(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const timeout = window.setTimeout(() => setRequestSearchTerm(requestSearchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [requestSearchInput])

  const loadResources = async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch('/api/faculty/resources', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load faculty resources.')
      }

      setResources(Array.isArray(payload?.resources) ? payload.resources : [])
      setTotalDownloads(Number(payload?.totalDownloads || 0))
      setErrorMessage('')
    } catch (error) {
      console.error('Faculty resource error:', error)
      setErrorMessage(error.message || 'Could not load faculty resources.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadNotifications = async () => {
    setNotificationsLoading(true)

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load notifications.')
      }

      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setNotificationsError('')
    } catch (error) {
      console.error('Faculty notifications error:', error)
      setNotifications([])
      setNotificationsError(error.message || 'Could not load notifications.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/faculty/resource-requests', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load faculty requests.')
      }

      setRequests(Array.isArray(payload?.requests) ? payload.requests : [])
    } catch (error) {
      console.error('Faculty requests error:', error)
      setRequests([])
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadResources()
    loadNotifications()
    loadRequests()
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

  const classOptions = useMemo(
    () => ['All Classes', ...new Set(resources.map((entry) => entry.class).filter(Boolean))],
    [resources]
  )

  const subjectOptions = useMemo(
    () => ['All Subjects', ...new Set(resources.map((entry) => entry.subject).filter(Boolean))],
    [resources]
  )

  const visibleResources = resources.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.title, entry.class, entry.subject, entry.status, entry.summary]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesClass = selectedClass === 'All Classes' || !selectedClass || entry.class === selectedClass
    const matchesSubject =
      selectedSubject === 'All Subjects' || !selectedSubject || entry.subject === selectedSubject

    return matchesSearch && matchesClass && matchesSubject
  })

  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length

  const visibleRequests = requests.filter((entry) => {
    const term = requestSearchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.studentName, entry.studentEmail, entry.courseName, entry.titleName, entry.preferredFormat, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesStatus = requestStatusFilter === 'all' || entry.status === requestStatusFilter
    return matchesSearch && matchesStatus
  })

  const openCreateModal = () => {
    setDraft(EMPTY_DRAFT)
    setEditorOpen(true)
  }

  const openEditModal = (entry) => {
    setDraft({
      id: entry.id,
      title: entry.title,
      class: entry.class,
      subject: entry.subject,
      fileUrl: entry.fileUrl,
      summary: entry.summary || '',
      status: entry.status || 'live',
      file: null,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setDraft(EMPTY_DRAFT)
  }

  const handleSave = async (event) => {
    event?.preventDefault?.()

    if (isSaving || uploadLockRef.current) {
      return
    }

    setIsSaving(true)

    const formData = new FormData()
    formData.append('title', draft.title)
    formData.append('class', draft.class)
    formData.append('subject', draft.subject)
    formData.append('summary', draft.summary)
    formData.append('status', draft.status)

    if (draft.file) {
      formData.append('file', draft.file)
    }

    if (!draft.id && draft.file) {
      const uploadId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      uploadLockRef.current = true
      setUploadJobs([
        {
          id: uploadId,
          fileName: draft.file.name,
          progress: 0,
          status: 'uploading',
        },
      ])
      closeEditor()

      // eslint-disable-next-line no-undef
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/faculty/resources')

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return
        }

        const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100)
        setUploadJobs((current) =>
          current.map((job) =>
            job.id === uploadId ? { ...job, progress: percentComplete, status: 'uploading' } : job
          )
        )
      }

      xhr.onload = async () => {
        const payload = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadJobs((current) =>
            current.map((job) =>
              job.id === uploadId
                ? { ...job, progress: 100, status: 'completed', message: 'Resource published.' }
                : job
            )
          )
          toast.success('Resource published.')
          await loadResources({ background: true })
        } else {
          setUploadJobs((current) =>
            current.map((job) =>
              job.id === uploadId
                ? {
                    ...job,
                    status: 'failed',
                    error: payload?.error || 'Could not save the resource.',
                  }
                : job
            )
          )
          toast.error(payload?.error || 'Could not save the resource.')
        }

        uploadLockRef.current = false
        setIsSaving(false)
      }

      xhr.onerror = () => {
        setUploadJobs((current) =>
          current.map((job) =>
            job.id === uploadId ? { ...job, status: 'failed', error: 'Network error during upload.' } : job
          )
        )
        toast.error('Network error during upload.')
        uploadLockRef.current = false
        setIsSaving(false)
      }

      xhr.send(formData)
      return
    }

    setRefreshing(true)
    try {
      if (!draft.id && !draft.file) {
        throw new Error('Please select a file to upload.')
      }

      const response = await fetch(
        draft.id ? `/api/faculty/resources/${draft.id}` : '/api/faculty/resources',
        {
          method: draft.id ? 'PATCH' : 'POST',
          body: draft.id ? JSON.stringify(Object.fromEntries(formData)) : formData,
          headers: draft.id ? { 'Content-Type': 'application/json' } : undefined,
        }
      )

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save the resource.')
      }

      toast.success(draft.id ? 'Publication updated.' : 'Resource published.')
      closeEditor()
      await loadResources({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not save the resource.')
    } finally {
      setRefreshing(false)
      setIsSaving(false)
    }
  }

  const toggleResourceStatus = async (entry) => {
    const nextStatus = entry.status === 'draft' ? 'live' : 'draft'

    try {
      const response = await fetch(`/api/faculty/resources/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status', status: nextStatus }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the resource status.')
      }

      setResources((current) => current.map((item) => (item.id === entry.id ? payload.resource : item)))
      toast.success(`${entry.title} is now ${nextStatus}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the resource status.')
    }
  }

  const markNotificationRead = async (notificationId) => {
    setNotificationsSaving(true)

    try {
      const response = await fetch('/api/notifications', {
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
      const response = await fetch('/api/notifications', {
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

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      const response = await fetch(`/api/faculty/resources/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not delete the resource.')
      }

      toast.success('Publication deleted.')
      await loadResources({ background: true })
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete the resource.')
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password.')
      }

      toast.success('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return <FacultyDashboardSkeleton />
  }

  return (
    <div className="student-panel">
      <DashboardSidebar
        role="faculty"
        title="Faculty Workspace"
        subtitle="Publishing Console"
        navItems={[
          { id: 'overview', label: 'Dashboard', href: '#faculty-overview', icon: Library },
          { id: 'publications', label: 'Publications', href: '#faculty-publications', icon: FileText },
          { id: 'requests', label: 'Requests', href: '#faculty-requests', icon: HelpCircle },
          { id: 'uploads', label: 'Uploads', href: '#faculty-uploads', icon: Upload },
          { id: 'profile', label: 'Profile', href: '#faculty-profile', icon: BookOpen },
          { id: 'security', label: 'Security', href: '#faculty-security', icon: Shield },
        ]}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={logout}
      />

      <div className="student-panel__main">
        <DashboardTopbar
          role="faculty"
          title="Faculty Dashboard"
          subtitle="Upload and manage course publications"
          onOpenMenu={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen((prev) => !prev)}
          unreadCount={unreadNotificationCount}
          userLabel={getDisplayName(user?.email, 'Faculty')}
        />

        <main className="student-panel__content p-4 md:p-6 flex flex-col gap-6 md:gap-8">
          {notificationsOpen ? (
            <div className="student-notification-panel-wrap" ref={notificationsPanelRef}>
              <Card className="student-notification-panel w-full max-w-md max-h-[50vh] flex flex-col" role="dialog" aria-label="Notifications">
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

                  {notificationsLoading ? <p>Fetching updates...</p> : null}
                  {!notificationsLoading && notifications.length === 0 ? <p>No notifications available.</p> : null}
                  {!notificationsLoading && notifications.length > 0
                    ? notifications.slice(0, 5).map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          className="student-notification-item"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          <div>
                            <strong>{notification.resourceTitle || notification.message || 'Update'}</strong>
                            <p>{notification.message || 'A new dashboard update is available.'}</p>
                            <span>{formatRelativeUpdate(notification.createdAt)}</span>
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
                      Mark all as read
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setNotificationsOpen(false)}>
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

          <section id="faculty-overview" className="student-section flex flex-col gap-4" aria-label="Faculty overview">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Overview</h2>
                <p className="text-muted-foreground text-sm">Track your publications, downloads, and upload performance.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Publications</CardDescription>
                  <CardTitle>{resources.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Total Downloads</CardDescription>
                  <CardTitle>{formatCompactNumber(totalDownloads)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Filtered Results</CardDescription>
                  <CardTitle>{visibleResources.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Status</CardDescription>
                  <CardTitle>{refreshing ? 'Syncing' : 'Live'}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          <section id="faculty-publications" className="student-section flex flex-col gap-4" aria-label="Faculty publications">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Publications</h2>
                <p className="text-muted-foreground text-sm">Use search, class, and subject filters to manage published materials.</p>
              </div>
            </div>

            <Card className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 hidden xl:flex">
                  <FileText size={16} /><span>Filters</span>
                </div>
                <div className="flex-1">
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by title, class, subject..."
                    aria-label="Search publications"
                    className="w-full"
                  />
                </div>
                <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <select
                    className="ui-input flex-1"
                    value={selectedClass}
                    onChange={(event) => setSelectedClass(event.target.value)}
                    aria-label="Filter publications by class"
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
                    aria-label="Filter publications by subject"
                  >
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0 flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                    {visibleResources.length} items
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
                    <RotateCcw size={14} className="mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </Card>

            {visibleResources.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground" role="status" aria-live="polite">
                <Inbox size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No publications found</h3>
                <p>Try changing search text, class, or subject filters.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {visibleResources.map((entry) => (
                  <Card key={entry.id} className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base line-clamp-1 mb-1" title={entry.title}>{entry.title || 'Untitled resource'}</h3>
                        <p className="text-sm text-foreground my-1">{entry.summary || 'No summary provided.'}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant="secondary" className="font-normal">{entry.subject || 'General'}</Badge>
                          <Badge variant="outline" className="font-normal">{entry.class || 'Unassigned class'}</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end">
                        <Badge variant={entry.status === 'draft' ? 'outline' : 'secondary'} className="mb-2">
                          {entry.status === 'draft' ? 'Draft' : 'Live'}
                        </Badge>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button type="button" variant="ghost" size="icon" className="-mr-2 -mb-2" aria-label={`Open actions for ${entry.title || 'resource'}`}><EllipsisVertical size={16} /></Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onSelect={() => toggleResourceStatus(entry)}>
                               {entry.status === 'draft' ? <FileText size={14} className="mr-2" /> : <BookOpen size={14} className="mr-2" />}
                               {entry.status === 'draft' ? 'Publish Resource' : 'Move to Draft'}
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onSelect={() => openEditModal(entry)}>
                               <Edit3 size={14} className="mr-2" />
                               Edit Details
                             </DropdownMenuItem>
                             <DropdownMenuItem className="text-destructive font-medium focus:text-destructive" onSelect={() => setDeleteTarget(entry)}>
                               <Trash2 size={14} className="mr-2" />
                               Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex bg-muted/50 p-2 py-1.5 rounded-md gap-2 items-center mt-auto justify-between border border-border/50">
                        <span className="text-xs text-muted-foreground mr-2">{formatDisplayDate(entry.createdAt)}</span>
                        <Button
                          size="sm"
                          variant={entry.status === 'draft' ? 'default' : 'outline'}
                          onClick={() => toggleResourceStatus(entry)}
                        >
                          {entry.status === 'draft' ? <BookOpen size={14} className="mr-1" /> : <FileText size={14} className="mr-1" />}
                          {entry.status === 'draft' ? 'Publish' : 'Draft'}
                        </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section id="faculty-requests" className="student-section flex flex-col gap-4" aria-label="Faculty requests">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Requests</h2>
                <p className="text-muted-foreground text-sm">Review incoming resource requests and student demand by topic.</p>
              </div>
            </div>

            <Card className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 hidden xl:flex">
                  <HelpCircle size={16} /><span>Filters</span>
                </div>
                <div className="flex-1">
                  <Input
                    value={requestSearchInput}
                    onChange={(event) => setRequestSearchInput(event.target.value)}
                    placeholder="Search by student, title, or course..."
                    aria-label="Search requests"
                    className="w-full"
                  />
                </div>
                <div className="w-full lg:w-auto">
                  <select
                    className="ui-input w-full lg:w-auto"
                    value={requestStatusFilter}
                    onChange={(event) => setRequestStatusFilter(event.target.value)}
                    aria-label="Filter requests by status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="underreview">Under Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="shrink-0 flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                    {visibleRequests.length} requests
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRequestSearchTerm(requestSearchInput)}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRequestSearchInput('')
                      setRequestSearchTerm('')
                      setRequestStatusFilter('all')
                    }}
                  >
                    <RotateCcw size={14} className="mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </Card>

            {visibleRequests.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground" role="status" aria-live="polite">
                <Inbox size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No requests found</h3>
                <p>Try a different search term or status filter.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {visibleRequests.map((entry) => (
                  <Card key={entry.id} className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base line-clamp-1 mb-1" title={entry.titleName || 'Untitled request'}>{entry.titleName || 'Untitled request'}</h3>
                        <p className="text-sm text-foreground my-1">{entry.studentName || entry.studentEmail || 'Unknown student'}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant="secondary" className="font-normal">{entry.courseName || 'No course'}</Badge>
                          <Badge variant="outline" className="font-normal">{entry.preferredFormat || 'Any format'}</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={entry.status === 'done' ? 'default' : entry.status === 'underreview' ? 'secondary' : 'outline'} className="mb-2">
                          {entry.status === 'underreview' ? 'Under Review' : entry.status === 'done' ? 'Done' : 'Pending'}
                        </Badge>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDisplayDate(entry.createdAt)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section id="faculty-uploads" className="student-section flex flex-col gap-4" aria-label="Upload queue">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Uploads</h2>
                <p className="text-muted-foreground text-sm">Track ongoing publication uploads with progress and status updates.</p>
              </div>
              <Button type="button" onClick={openCreateModal}>
                <Upload size={14} className="mr-2" />
                Upload Resource
              </Button>
            </div>
            <Card className="max-h-[50vh] flex flex-col">
              <CardContent className="student-download-list flex-1 overflow-y-auto p-5 custom-scrollbar">
                {uploadJobs.length > 0 ? (
                  uploadJobs.map((job) => (
                    <div key={job.id} className="student-download-item flex justify-between items-center py-3 border-b border-border last:border-0 gap-4">
                      <div className="flex-1 min-w-0">
                        <strong className="block text-sm font-medium line-clamp-1" title={job.fileName}>{job.fileName}</strong>
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.status === 'failed'
                            ? job.error || 'Upload failed.'
                            : `${job.status} (${job.progress}%)`}
                        </p>
                      </div>
                      <div style={{ width: '12rem' }} className="shrink-0">
                        <Progress value={job.progress} aria-label={`${job.fileName} upload progress`} />
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                    <p>No active upload jobs.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section id="faculty-profile" className="student-section flex flex-col gap-4" aria-label="Faculty profile">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="text-muted-foreground text-sm">Faculty identity and role information.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardDescription>Role</CardDescription>
                  <CardTitle className="inline-flex items-center gap-2">
                    <RoleAvatar role="faculty" size="sm" label="Faculty role icon" />
                    <ShieldCheck size={16} />
                    Faculty
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Email</CardDescription>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <Mail size={16} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{user?.email || 'faculty@spseducationam.edu'}</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Last Sync</CardDescription>
                  <CardTitle>{refreshing ? 'Syncing now' : 'Up to date'}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          <section id="faculty-security" className="student-section flex flex-col gap-4" aria-label="Security settings">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Security</h2>
              <p className="text-muted-foreground text-sm">Update your password to keep your account protected.</p>
            </div>
            <Card>
              <CardContent className="p-6">
                <form className="flex flex-col gap-4 max-w-md" onSubmit={handlePasswordChange}>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Current password</span>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">New password</span>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Confirm new password</span>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </label>
                  <div className="pt-2">
                    <Button type="submit" disabled={passwordLoading}>
                      <Shield size={14} className="mr-2" />
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen} labelledBy="faculty-editor-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="faculty-editor-title">{draft.id ? 'Edit Publication' : 'Upload Resource'}</DialogTitle>
          <DialogDescription>
            Publish through the faculty API with ownership checks and audit logging.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className="student-request-form" onSubmit={handleSave}>
            <label>
              <span>Title</span>
              <Input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Class</span>
              <Input
                value={draft.class}
                onChange={(event) => setDraft((current) => ({ ...current, class: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Subject</span>
              <Input
                value={draft.subject}
                onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Resource file</span>
              <Input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    setDraft((current) => ({ ...current, file }))
                  }
                }}
              />
            </label>
            <label>
              <span>Summary</span>
              <Textarea
                rows={4}
                value={draft.summary}
                onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
              />
            </label>
            <label>
              <span>Publication status</span>
              <select
                className="ui-input"
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="live">Live</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeEditor} disabled={isSaving}>
            <X size={14} />
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : draft.id ? 'Save Changes' : 'Publish Resource'}
          </Button>
        </DialogFooter>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        {deleteTarget ? (
          <div className="ui-dialog__content">
            <div className="ui-dialog__header">
              <h3 className="ui-dialog__title">Delete publication?</h3>
              <p className="ui-dialog__description">
                Remove "{deleteTarget.title}" from your publication list. This cannot be undone.
              </p>
            </div>
            <div className="modal-form__actions" style={{ marginTop: '1rem' }}>
              <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
                <X size={14} />
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete}>
                <Trash2 size={14} />
                Delete Publication
              </Button>
            </div>
          </div>
        ) : null}
      </AlertDialog>
    </div>
  )
}
