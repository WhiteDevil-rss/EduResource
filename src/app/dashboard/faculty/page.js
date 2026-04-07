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
  Plus,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FacultyDashboardSkeleton } from '@/components/LoadingStates'
import { DashboardScrollableSection } from '@/components/dashboard/DashboardScrollableSection'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'
import { RoleAvatar } from '@/components/dashboard/RoleAvatar'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [selectedClass, setSelectedClass] = useState('All Classes')
  const [selectedSubject, setSelectedSubject] = useState('All Subjects')
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

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadResources()
    loadNotifications()
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
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onOpenMenu={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen((prev) => !prev)}
          unreadCount={unreadNotificationCount}
          userLabel={getDisplayName(user?.email, 'Faculty')}
        />

        <main className="student-panel__content">
          {notificationsOpen ? (
            <div className="student-notification-panel-wrap" ref={notificationsPanelRef}>
              <Card className="student-notification-panel" role="dialog" aria-label="Notifications">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>{unreadNotificationCount} unread update(s)</CardDescription>
                </CardHeader>
                <CardContent className="student-notification-list">
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

                  <div className="student-notification-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={readAllNotifications}
                      disabled={notificationsSaving || unreadNotificationCount === 0}
                    >
                      <CheckCircle2 size={14} />
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

          <section id="faculty-overview" className="student-section" aria-label="Faculty overview">
            <div className="student-section__heading">
              <h2>Overview</h2>
              <p>Track your publications, downloads, and upload performance.</p>
            </div>
            <div className="student-metrics">
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

          <DashboardScrollableSection
            id="faculty-publications"
            ariaLabel="Faculty publications"
            title="Publications"
            description="Use search, class, and subject filters to manage published materials."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search publications"
                    aria-label="Search publications"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Class</span>
                  <select
                    className="ui-input"
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
                </label>
                <label className="student-filter-control">
                  <span>Subject</span>
                  <select
                    className="ui-input"
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
                </label>
                <div className="student-filter-actions">
                  <Button type="button" variant="outline" onClick={() => setSearchTerm(searchInput.trim())}>
                    <FileText size={14} />
                    Apply
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
                <Badge variant="outline" className="student-filter-count">
                  {visibleResources.length} result(s)
                </Badge>
              </CardContent>
            </Card>

            {visibleResources.length === 0 ? (
              <Card className="student-empty-state" role="status" aria-live="polite">
                <CardContent>
                  <Inbox size={32} />
                  <h3>No results found</h3>
                  <p>Try changing search text, class, or subject filters.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="student-resource-grid">
                {visibleResources.map((entry) => (
                  <Card key={entry.id} className="student-resource-card">
                    <CardHeader className="student-resource-card__header">
                      <div className="student-resource-card__meta">
                        <Badge>{entry.subject || 'General'}</Badge>
                        <Badge variant="outline">{entry.class || 'Unassigned class'}</Badge>
                      </div>
                      <Badge variant={entry.status === 'draft' ? 'outline' : 'secondary'}>
                        {entry.status === 'draft' ? 'Draft' : 'Live'}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="student-resource-card__title">{entry.title}</CardTitle>
                      <p className="student-resource-card__summary">{entry.summary || 'No summary provided.'}</p>
                    </CardContent>
                    <CardFooter className="student-resource-card__footer">
                      <span className="student-resource-card__updated">{formatDisplayDate(entry.createdAt)}</span>
                      <div className="table-action-group">
                        <Button
                          type="button"
                          variant={entry.status === 'draft' ? 'default' : 'outline'}
                          onClick={() => toggleResourceStatus(entry)}
                        >
                          {entry.status === 'draft' ? 'Publish' : 'Move to Draft'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => openEditModal(entry)} aria-label={`Edit ${entry.title}`}>
                          <Edit3 size={14} />
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setDeleteTarget(entry)} aria-label={`Delete ${entry.title}`}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </DashboardScrollableSection>

          <DashboardScrollableSection
            id="faculty-uploads"
            ariaLabel="Upload queue"
            title="Uploads"
            description="Track ongoing publication uploads with progress and status updates."
          >
            <Card>
              <CardContent className="student-download-list">
                <Button type="button" onClick={openCreateModal}>
                  <Plus size={14} />
                  Upload Resource
                </Button>
                {uploadJobs.length > 0 ? (
                  uploadJobs.map((job) => (
                    <div key={job.id} className="student-download-item">
                      <div>
                        <strong>{job.fileName}</strong>
                        <p>
                          {job.status === 'failed'
                            ? job.error || 'Upload failed.'
                            : `${job.status} (${job.progress}%)`}
                        </p>
                      </div>
                      <div style={{ width: '12rem' }}>
                        <Progress value={job.progress} aria-label={`${job.fileName} upload progress`} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="student-muted-text">No active upload jobs.</p>
                )}
              </CardContent>
            </Card>
          </DashboardScrollableSection>

          <section id="faculty-profile" className="student-section" aria-label="Faculty profile">
            <div className="student-section__heading">
              <h2>Profile</h2>
              <p>Faculty identity and role information.</p>
            </div>
            <div className="student-profile-cards">
              <Card>
                <CardHeader>
                  <CardDescription>Role</CardDescription>
                  <CardTitle style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RoleAvatar role="faculty" size="sm" label="Faculty role icon" />
                    Faculty
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Email</CardDescription>
                  <CardTitle>{user?.email || 'faculty@spseducationam.edu'}</CardTitle>
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

          <section id="faculty-security" className="student-section" aria-label="Security settings">
            <div className="student-section__heading">
              <h2>Security</h2>
              <p>Update your password to keep your account protected.</p>
            </div>
            <Card>
              <CardContent>
                <form className="student-request-form" onSubmit={handlePasswordChange}>
                  <label>
                    <span>Current password</span>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>New password</span>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Confirm new password</span>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </label>
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
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
                Cancel
              </Button>
              <Button type="button" onClick={confirmDelete}>
                Delete Publication
              </Button>
            </div>
          </div>
        ) : null}
      </AlertDialog>
    </div>
  )
}
