'use client'

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Inbox,
  KeyRound,
  LayoutPanelTop,
  Library,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AdminDashboardSkeleton } from '@/components/LoadingStates'
import { DashboardScrollableSection } from '@/components/dashboard/DashboardScrollableSection'
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
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { formatDisplayDate, formatRelativeUpdate, getDisplayName } from '@/lib/demo-content'

const EMPTY_CREATE_FORM = {
  role: 'faculty',
  displayName: '',
  email: '',
}

function requestStatusLabel(status) {
  if (status === 'underreview') return 'Under Review'
  if (status === 'done') return 'Done'
  return 'Pending'
}

function authProviderLabel(entry) {
  if (entry.authProvider === 'google') {
    return entry.pending ? 'Google access pending' : 'Google OAuth'
  }
  return 'Admin-issued credentials'
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [resources, setResources] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [resetModal, setResetModal] = useState(null)
  const [pendingCredentials, setPendingCredentials] = useState(null)
  const [deleteModalTarget, setDeleteModalTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [resourceClassFilter, setResourceClassFilter] = useState('All Classes')
  const [resourceSubjectFilter, setResourceSubjectFilter] = useState('All Subjects')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const notificationsPanelRef = useRef(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const loadOverview = async ({ background = false } = {}) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load the admin overview.')
      }

      setUsers(Array.isArray(payload?.users) ? payload.users : [])
      setResources(Array.isArray(payload?.resources) ? payload.resources : [])
      setActivity(Array.isArray(payload?.activity) ? payload.activity : [])
      setErrorMessage(payload?.warning ? String(payload.warning) : '')
    } catch (error) {
      console.error('Admin overview error:', error)
      setErrorMessage(error.message || 'Could not load the admin overview.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadRequests = async ({ background = false } = {}) => {
    if (!background) {
      setRefreshing(true)
    }

    try {
      const response = await fetch('/api/admin/resource-requests', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load the resource requests.')
      }

      setRequests(Array.isArray(payload?.requests) ? payload.requests : [])
      setErrorMessage('')
    } catch (error) {
      console.error('Admin requests error:', error)
      setErrorMessage(error.message || 'Could not load the resource requests.')
    } finally {
      if (!background) {
        setRefreshing(false)
      }
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
      console.error('Admin notifications error:', error)
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

    loadOverview()
    loadRequests()
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

  const resourceClassOptions = useMemo(
    () => ['All Classes', ...new Set(resources.map((entry) => entry.class).filter(Boolean))],
    [resources]
  )

  const resourceSubjectOptions = useMemo(
    () => ['All Subjects', ...new Set(resources.map((entry) => entry.subject).filter(Boolean))],
    [resources]
  )

  const filteredUsers = users.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.displayName, entry.email, entry.loginId, entry.role, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)
    const matchesRole = userRoleFilter === 'all' || entry.role === userRoleFilter
    return matchesSearch && matchesRole
  })

  const filteredResources = resources.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.title, entry.class, entry.subject, entry.summary, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesClass =
      resourceClassFilter === 'All Classes' || !resourceClassFilter || entry.class === resourceClassFilter
    const matchesSubject =
      resourceSubjectFilter === 'All Subjects' || !resourceSubjectFilter || entry.subject === resourceSubjectFilter

    return matchesSearch && matchesClass && matchesSubject
  })

  const filteredRequests = requests.filter((entry) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [entry.studentName, entry.studentEmail, entry.courseName, entry.titleName, entry.preferredFormat, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)

    const matchesStatus = requestStatusFilter === 'all' || entry.status === requestStatusFilter
    return matchesSearch && matchesStatus
  })

  const activeStudents = users.filter((entry) => entry.role === 'student' && entry.status === 'active').length
  const facultyCount = users.filter((entry) => entry.role === 'faculty').length
  const openRequests = requests.filter((entry) => entry.status !== 'done').length
  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length

  const exportUsers = () => {
    const headers = ['Name', 'Email', 'Login ID', 'Role', 'Auth Provider', 'Status']
    const rows = filteredUsers.map((entry) => [
      entry.displayName || getDisplayName(entry.email, 'User'),
      entry.email,
      entry.loginId || '-',
      entry.role,
      authProviderLabel(entry),
      entry.status,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sps-educationam-access-control.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setSubmittingCreate(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not create the requested account.')
      }

      setPendingCredentials(
        payload?.credentials
          ? {
              ...payload.credentials,
              role: payload?.user?.role || createForm.role,
              email: payload?.user?.email || createForm.email,
            }
          : null
      )
      setCreateForm(EMPTY_CREATE_FORM)
      setCreateOpen(false)
      toast.success('Account created successfully.')
      await loadOverview({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not create the requested account.')
    } finally {
      setSubmittingCreate(false)
    }
  }

  const confirmHardDelete = async () => {
    if (!deleteModalTarget || confirmText !== 'DELETE') {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${deleteModalTarget.id}`, {
        method: 'DELETE',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not permanently delete the account.')
      }

      setUsers((current) => current.filter((item) => item.id !== deleteModalTarget.id))
      toast.success('Account permanently removed.')
      setDeleteModalTarget(null)
    } catch (error) {
      toast.error(error.message || 'Could not delete the user account.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResetCredentials = async (targetUser, forcedPassword = null) => {
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetCredentials',
          password: forcedPassword || undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not reset the credentials.')
      }

      setPendingCredentials({
        ...payload.credentials,
        role: targetUser.role,
        email: targetUser.email,
      })

      setResetModal(null)
      toast.success(forcedPassword ? 'Password updated successfully.' : 'Temporary credentials generated.')
      await loadOverview({ background: true })
    } catch (error) {
      toast.error(error.message || 'Could not reset the credentials.')
      if (resetModal) {
        setResetModal((prev) => ({ ...prev, submitting: false }))
      }
    }
  }

  const handleRequestStatusChange = async (requestEntry, status) => {
    try {
      const response = await fetch(`/api/admin/resource-requests/${requestEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the request status.')
      }

      setRequests((current) => current.map((entry) => (entry.id === requestEntry.id ? payload.request : entry)))
      toast.success(`Request moved to ${requestStatusLabel(status).toLowerCase()}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the request status.')
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

  if (loading) {
    return <AdminDashboardSkeleton />
  }

  return (
    <div className="student-panel">
      <DashboardSidebar
        role="admin"
        title="Admin Center"
        subtitle="Access Control"
        navItems={[
          { id: 'overview', label: 'Dashboard', href: '#admin-overview', icon: LayoutPanelTop },
          { id: 'users', label: 'Users', href: '#admin-users', icon: Users },
          { id: 'resources', label: 'Resources', href: '#admin-resources', icon: FileText },
          { id: 'requests', label: 'Requests', href: '#admin-requests', icon: Library },
          { id: 'activity', label: 'Activity', href: '#admin-activity', icon: Shield },
        ]}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={logout}
      />

      <div className="student-panel__main">
        <DashboardTopbar
          role="admin"
          title="Admin Dashboard"
          subtitle="Manage users, publications, and requests"
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onOpenMenu={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen((prev) => !prev)}
          unreadCount={unreadNotificationCount}
          userLabel={getDisplayName(user?.email, 'Admin')}
        />

        <main className="student-panel__content">
          {notificationsOpen ? (
            <div className="student-notification-panel-wrap" ref={notificationsPanelRef}>
              <Card className="student-notification-panel" role="dialog" aria-label="Notifications center">
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

          <section id="admin-overview" className="student-section" aria-label="Admin overview">
            <div className="student-section__heading">
              <h2>Overview</h2>
              <p>Unified governance across users, content, and requests.</p>
              <p className="student-muted-text">{refreshing ? 'Refreshing live data...' : 'Data synced from protected APIs.'}</p>
            </div>
            <div className="student-metrics">
              <Card>
                <CardHeader>
                  <CardDescription>Total Accounts</CardDescription>
                  <CardTitle>{users.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Active Students</CardDescription>
                  <CardTitle>{activeStudents}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Faculty Accounts</CardDescription>
                  <CardTitle>{facultyCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Open Requests</CardDescription>
                  <CardTitle>{openRequests}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          {pendingCredentials ? (
            <section className="student-section" aria-label="One-time credentials">
              <Card>
                <CardHeader>
                  <CardTitle>One-Time Credentials</CardTitle>
                  <CardDescription>Copy and share securely. This view appears once per admin session.</CardDescription>
                </CardHeader>
                <CardContent className="student-download-list">
                  <div className="student-download-item"><strong>Role</strong><p>{pendingCredentials.role}</p></div>
                  <div className="student-download-item"><strong>Email</strong><p>{pendingCredentials.email}</p></div>
                  {pendingCredentials.loginId ? <div className="student-download-item"><strong>Login ID</strong><p>{pendingCredentials.loginId}</p></div> : null}
                  {pendingCredentials.temporaryPassword ? <div className="student-download-item"><strong>Temporary Password</strong><p>{pendingCredentials.temporaryPassword}</p></div> : null}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <DashboardScrollableSection
            id="admin-users"
            ariaLabel="User management"
            title="User Management"
            description="Create, review, and remove accounts with role-aware controls."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search users by name, email, role"
                    aria-label="Search users"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Role</span>
                  <select className="ui-input" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <div className="student-filter-actions">
                  <Button type="button" variant="outline" onClick={() => setSearchTerm(searchInput.trim())}>
                    <Users size={14} />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setUserRoleFilter('all')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={exportUsers}><Download size={14} />Export CSV</Button>
                <Button type="button" onClick={() => setCreateOpen(true)}><Sparkles size={14} />Create Account</Button>
              </CardContent>
            </Card>
            {filteredUsers.length === 0 ? (
              <Card className="student-empty-state"><CardContent><Inbox size={32} /><h3>No users found</h3><p>Adjust search or role filters.</p></CardContent></Card>
            ) : (
              <div className="student-resource-grid">
                {filteredUsers.map((entry) => (
                  <Card key={entry.id} className="student-resource-card">
                    <CardHeader className="student-resource-card__header">
                      <div className="student-resource-card__meta">
                        <RoleAvatar role={entry.role} size="sm" label={`${entry.role} icon`} />
                        <Badge>{entry.role}</Badge>
                        <Badge variant="outline">{entry.status}</Badge>
                      </div>
                      <Badge variant="outline">{authProviderLabel(entry)}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="student-resource-card__title">{entry.displayName || getDisplayName(entry.email, 'User')}</CardTitle>
                      <p className="student-resource-card__summary">{entry.email}</p>
                      <p className="student-resource-card__updated">{entry.loginId ? `Login ID: ${entry.loginId}` : 'Google-only identity'}</p>
                    </CardContent>
                    <CardContent style={{ paddingTop: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button type="button" variant="outline" onClick={() => setResetModal({ user: entry, password: '', submitting: false })}>
                        <KeyRound size={14} />
                        Reset Password
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDeleteModalTarget(entry)
                          setConfirmText('')
                        }}
                      >
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DashboardScrollableSection>

          <DashboardScrollableSection
            id="admin-resources"
            ariaLabel="Resource audit"
            title="Resources & Publications"
            description="Audit platform publications with class and subject filters."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search resources"
                    aria-label="Search resources"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Class</span>
                  <select className="ui-input" value={resourceClassFilter} onChange={(event) => setResourceClassFilter(event.target.value)}>
                    {resourceClassOptions.map((entryClass) => (
                      <option key={entryClass} value={entryClass}>{entryClass}</option>
                    ))}
                  </select>
                </label>
                <label className="student-filter-control">
                  <span>Subject</span>
                  <select className="ui-input" value={resourceSubjectFilter} onChange={(event) => setResourceSubjectFilter(event.target.value)}>
                    {resourceSubjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
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
                      setResourceClassFilter('All Classes')
                      setResourceSubjectFilter('All Subjects')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
                <Badge variant="outline" className="student-filter-count">{filteredResources.length} result(s)</Badge>
              </CardContent>
            </Card>
            {filteredResources.length === 0 ? (
              <Card className="student-empty-state"><CardContent><Inbox size={32} /><h3>No resources found</h3><p>Adjust search, class, or subject filters.</p></CardContent></Card>
            ) : (
              <div className="student-resource-grid">
                {filteredResources.map((entry) => (
                  <Card key={entry.id} className="student-resource-card">
                    <CardHeader className="student-resource-card__header">
                      <div className="student-resource-card__meta">
                        <Badge>{entry.subject || 'General'}</Badge>
                        <Badge variant="outline">{entry.class || 'Unassigned class'}</Badge>
                      </div>
                      <Badge variant={entry.status === 'live' ? 'secondary' : 'outline'}>{entry.status || 'unknown'}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="student-resource-card__title">{entry.title}</CardTitle>
                      <p className="student-resource-card__summary">{entry.summary || 'No summary provided.'}</p>
                      <p className="student-resource-card__updated">{formatDisplayDate(entry.createdAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DashboardScrollableSection>

          <DashboardScrollableSection
            id="admin-requests"
            ariaLabel="Resource requests"
            title="Resource Requests"
            description="Track student requests and update statuses with one click."
          >
            <Card className="student-filter-card">
              <CardContent className="student-filter-card__content">
                <label className="student-filter-control student-filter-control--search">
                  <span>Search</span>
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search requests"
                    aria-label="Search requests"
                  />
                </label>
                <label className="student-filter-control">
                  <span>Status</span>
                  <select className="ui-input" value={requestStatusFilter} onChange={(event) => setRequestStatusFilter(event.target.value)}>
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="underreview">Under Review</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <div className="student-filter-actions">
                  <Button type="button" variant="outline" onClick={() => setSearchTerm(searchInput.trim())}>
                    <Library size={14} />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setRequestStatusFilter('all')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
                <Badge variant="outline" className="student-filter-count">{filteredRequests.length} result(s)</Badge>
              </CardContent>
            </Card>
            {filteredRequests.length === 0 ? (
              <Card className="student-empty-state"><CardContent><Inbox size={32} /><h3>No requests found</h3><p>Try a different search term or status filter.</p></CardContent></Card>
            ) : (
              <div className="student-resource-grid">
                {filteredRequests.map((entry) => (
                  <Card key={entry.id} className="student-resource-card">
                    <CardHeader className="student-resource-card__header">
                      <div className="student-resource-card__meta">
                        <Badge>{entry.courseName || 'No course'}</Badge>
                        <Badge variant="outline">{entry.preferredFormat || 'Any format'}</Badge>
                      </div>
                      <Badge variant={entry.status === 'done' ? 'secondary' : 'outline'}>{requestStatusLabel(entry.status)}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="student-resource-card__title">{entry.titleName || 'Untitled request'}</CardTitle>
                      <p className="student-resource-card__summary">{entry.studentName || entry.studentEmail}</p>
                      <p className="student-resource-card__updated">{formatDisplayDate(entry.createdAt)}</p>
                    </CardContent>
                    <CardContent style={{ paddingTop: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button type="button" variant="outline" onClick={() => handleRequestStatusChange(entry, 'pending')} disabled={entry.status === 'pending'}>Pending</Button>
                      <Button type="button" variant="outline" onClick={() => handleRequestStatusChange(entry, 'underreview')} disabled={entry.status === 'underreview'}>Review</Button>
                      <Button type="button" variant="outline" onClick={() => handleRequestStatusChange(entry, 'done')} disabled={entry.status === 'done'}>Done</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DashboardScrollableSection>

          <DashboardScrollableSection
            id="admin-activity"
            ariaLabel="Activity log"
            title="Activity"
            description="Recent access-control and moderation events."
          >
            <Card>
              <CardContent className="student-download-list">
                {activity.length > 0 ? (
                  activity.map((entry) => (
                    <div key={entry.id} className="student-download-item">
                      <div>
                        <strong>{entry.message || entry.action}</strong>
                        <p>{formatDisplayDate(entry.createdAt, 'Activity recorded')}</p>
                      </div>
                      <Badge variant="outline">{entry.action}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="student-muted-text">Audit events will appear after protected actions are performed.</p>
                )}
              </CardContent>
            </Card>
          </DashboardScrollableSection>
        </main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen} labelledBy="admin-create-account-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="admin-create-account-title">Create Account</DialogTitle>
          <DialogDescription>
            Provision Google-only students or admin-issued credentials for faculty/admin roles.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form className="student-request-form" onSubmit={handleCreateUser}>
            <label>
              <span>Role</span>
              <select
                className="ui-input"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
                <option value="student">Student</option>
              </select>
            </label>
            <label>
              <span>Display name</span>
              <Input
                type="text"
                value={createForm.displayName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Email</span>
              <Input
                type="email"
                required
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <div className="student-inline-message">
              <KeyRound size={16} />
              <span>Staff accounts receive temporary credentials. Students use Google OAuth.</span>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateUser} disabled={submittingCreate}>
            {submittingCreate ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={Boolean(resetModal)} onOpenChange={(open) => !open && setResetModal(null)} labelledBy="admin-reset-password-title" className="student-request-modal">
        <DialogHeader>
          <DialogTitle id="admin-reset-password-title">Reset User Password</DialogTitle>
          <DialogDescription>
            Set a manual password or leave empty for a generated secure password.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form
            className="student-request-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!resetModal) {
                return
              }
              setResetModal((prev) => ({ ...prev, submitting: true }))
              handleResetCredentials(resetModal.user, resetModal.password.trim() || null)
            }}
          >
            <label>
              <span>Manual password (optional)</span>
              <Input
                type="text"
                autoComplete="off"
                value={resetModal?.password || ''}
                onChange={(event) => setResetModal((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Leave blank to auto-generate"
              />
            </label>
            <div className="student-inline-message">
              <Shield size={16} />
              <span>Credentials are generated instantly and shown in this admin session.</span>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={resetModal?.submitting} onClick={() => setResetModal(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={resetModal?.submitting}
            onClick={() => {
              if (!resetModal) {
                return
              }
              setResetModal((prev) => ({ ...prev, submitting: true }))
              handleResetCredentials(resetModal.user, resetModal.password.trim() || null)
            }}
          >
            {resetModal?.submitting ? 'Processing...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </Dialog>

      <AlertDialog open={Boolean(deleteModalTarget)} onOpenChange={(open) => !open && setDeleteModalTarget(null)}>
        {deleteModalTarget ? (
          <div className="ui-dialog__content">
            <div className="ui-dialog__header">
              <h3 className="ui-dialog__title">Permanently delete account?</h3>
              <p className="ui-dialog__description">
                Remove "{deleteModalTarget.displayName || deleteModalTarget.email}" from the system and revoke authentication.
              </p>
            </div>
            <div className="student-request-form" style={{ marginTop: '1rem' }}>
              <label>
                <span>Type DELETE to confirm</span>
                <Input
                  type="text"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="DELETE"
                />
              </label>
            </div>
            <div className="modal-form__actions" style={{ marginTop: '1rem' }}>
              <Button type="button" variant="ghost" onClick={() => setDeleteModalTarget(null)} disabled={isDeleting}>
                Keep Account
              </Button>
              <Button type="button" onClick={confirmHardDelete} disabled={isDeleting || confirmText !== 'DELETE'}>
                {isDeleting ? 'Removing...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        ) : null}
      </AlertDialog>
    </div>
  )
}
