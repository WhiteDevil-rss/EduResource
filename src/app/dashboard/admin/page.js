'use client'

import {
  AlertCircle,
  CheckCircle2,
  Download,
  EllipsisVertical,
  Ban,
  FileText,
  HelpCircle,
  Inbox,
  KeyRound,
  LayoutPanelTop,
  Library,
  Mail,
  RefreshCcw,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AdminDashboardSkeleton } from '@/components/LoadingStates'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [resourceSearchInput, setResourceSearchInput] = useState('')
  const [resourceSearchTerm, setResourceSearchTerm] = useState('')
  const [requestSearchInput, setRequestSearchInput] = useState('')
  const [requestSearchTerm, setRequestSearchTerm] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [resourceClassFilter, setResourceClassFilter] = useState('All Classes')
  const [resourceSubjectFilter, setResourceSubjectFilter] = useState('All Subjects')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const notificationsPanelRef = useRef(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const timeout = window.setTimeout(() => setResourceSearchTerm(resourceSearchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [resourceSearchInput])

  useEffect(() => {
    const timeout = window.setTimeout(() => setRequestSearchTerm(requestSearchInput), 220)
    return () => window.clearTimeout(timeout)
  }, [requestSearchInput])

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
    const term = resourceSearchTerm.trim().toLowerCase()
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

  const handleSetUserStatus = async (targetUser, nextStatus) => {
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-status', status: nextStatus }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the user status.')
      }

      setUsers((current) => current.map((item) => (item.id === targetUser.id ? payload.user : item)))
      toast.success(`User set to ${nextStatus}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the user status.')
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
          onOpenMenu={() => setMobileNavOpen(true)}
          onOpenNotifications={() => setNotificationsOpen((prev) => !prev)}
          unreadCount={unreadNotificationCount}
          userLabel={getDisplayName(user?.email, 'Admin')}
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

          <section id="admin-overview" className="student-section flex flex-col gap-4" aria-label="Admin overview">
            <div className="student-section__heading flex justify-between items-end flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold">Overview</h2>
                <p className="text-muted-foreground text-sm">Unified governance across users, content, and requests.</p>
              </div>
              <p className="text-sm font-medium animate-pulse text-muted-foreground">{refreshing ? 'Refreshing live data...' : 'Data synced from protected APIs.'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <section className="student-section flex flex-col gap-4" aria-label="One-time credentials">
              <Card>
                <CardHeader>
                  <CardTitle>One-Time Credentials</CardTitle>
                  <CardDescription>Copy and share securely. This view appears once per admin session.</CardDescription>
                </CardHeader>
                <CardContent className="student-download-list flex flex-col gap-4">
                  <div className="flex justify-between items-center py-2 border-b border-border"><strong><UserRound size={14} className="mr-2 inline" />Role</strong><p>{pendingCredentials.role}</p></div>
                  <div className="flex justify-between items-center py-2 border-b border-border"><strong><Mail size={14} className="mr-2 inline" />Email</strong><p>{pendingCredentials.email}</p></div>
                  {pendingCredentials.loginId ? <div className="flex justify-between items-center py-2 border-b border-border"><strong><FileText size={14} className="mr-2 inline" />Login ID</strong><p className="font-mono">{pendingCredentials.loginId}</p></div> : null}
                  {pendingCredentials.temporaryPassword ? <div className="flex justify-between items-center py-2 border-b border-border"><strong><KeyRound size={14} className="mr-2 inline"/>Temporary Password</strong><p className="font-mono">{pendingCredentials.temporaryPassword}</p></div> : null}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section id="admin-users" className="student-section flex flex-col gap-4" aria-label="User management">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">User Management</h2>
              <p className="text-muted-foreground text-sm">Create, review, and remove accounts with role-aware controls.</p>
            </div>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 hidden lg:flex">
                  <Users size={16} /><span>Filters</span>
                </div>
                <div className="flex-1">
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search users by name or email..."
                    aria-label="Search users"
                    className="w-full"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <select className="ui-input w-full md:w-auto" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <Button type="button" variant="outline" className="flex-1 md:flex-none" onClick={exportUsers}><Download size={14} className="mr-2"/>Export</Button>
                  <Button type="button" className="flex-1 md:flex-none" onClick={() => setCreateOpen(true)}><UserPlus size={14} className="mr-2"/>Create</Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 md:flex-none"
                    onClick={() => setSearchTerm(searchInput)}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 md:flex-none"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setUserRoleFilter('all')
                    }}
                  >
                    <RotateCcw size={14} className="mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </Card>
            
            {filteredUsers.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground">
                <Inbox size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No users found</h3>
                <p>Adjust search or role filters.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredUsers.map((entry) => (
                  <Card key={entry.id} className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate" title={entry.displayName || getDisplayName(entry.email, 'User')}>
                            {entry.displayName || getDisplayName(entry.email, 'User')}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground truncate" title={entry.email}>{entry.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 -mr-2" aria-label={`Open actions for ${entry.displayName || entry.email}`}><EllipsisVertical size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => setResetModal({ user: entry, password: '', submitting: false })}>
                            <RefreshCcw size={14} className="mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          {entry.role !== 'admin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleSetUserStatus(entry, entry.status === 'disabled' ? 'active' : 'disabled')}>
                                {entry.status === 'disabled' ? <Sparkles size={14} className="mr-2" /> : <Ban size={14} className="mr-2" />}
                                {entry.status === 'disabled' ? 'Enable User' : 'Disable User'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive font-medium focus:text-destructive" onSelect={() => {
                                setDeleteModalTarget(entry)
                                setConfirmText('')
                              }}>
                                <Trash2 size={14} className="mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                      <Badge variant="secondary" className="capitalize">{entry.role}</Badge>
                      <Badge variant={entry.status === 'disabled' ? 'destructive' : 'outline'} className="capitalize">{entry.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section id="admin-resources" className="student-section flex flex-col gap-4" aria-label="Resource audit">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Resources & Publications</h2>
              <p className="text-muted-foreground text-sm">Audit platform publications with class and subject filters.</p>
            </div>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 hidden lg:flex">
                  <FileText size={16} /><span>Filters</span>
                </div>
                <div className="flex-1">
                  <Input
                    value={resourceSearchInput}
                    onChange={(event) => setResourceSearchInput(event.target.value)}
                    placeholder="Search resources by title or details..."
                    aria-label="Search resources"
                    className="w-full"
                  />
                </div>
                <div className="flex-1 flex gap-4 w-full md:w-auto">
                  <select className="ui-input flex-1" value={resourceClassFilter} onChange={(event) => setResourceClassFilter(event.target.value)}>
                    {resourceClassOptions.map((entryClass) => (
                      <option key={entryClass} value={entryClass}>{entryClass}</option>
                    ))}
                  </select>
                  <select className="ui-input flex-1" value={resourceSubjectFilter} onChange={(event) => setResourceSubjectFilter(event.target.value)}>
                    {resourceSubjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                    {filteredResources.length} items
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResourceSearchTerm(resourceSearchInput)}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setResourceSearchInput('')
                      setResourceSearchTerm('')
                      setResourceClassFilter('All Classes')
                      setResourceSubjectFilter('All Subjects')
                    }}
                  >
                    <RotateCcw size={14} className="mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </Card>
            
            {filteredResources.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground">
                <Inbox size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No resources found</h3>
                <p>Adjust search, class, or subject filters.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredResources.map((entry) => (
                  <Card key={entry.id} className="p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                       <h3 className="font-semibold text-base line-clamp-2" title={entry.title}>{entry.title}</h3>
                       <Badge variant={entry.status === 'live' ? 'secondary' : 'outline'} className="shrink-0 capitalize">{entry.status || 'unknown'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.summary || 'No summary provided.'}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-auto pt-4 border-t">
                      <Badge variant="secondary">{entry.subject || 'General'}</Badge>
                      <Badge variant="outline">{entry.class || 'Unassigned class'}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{formatDisplayDate(entry.createdAt)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section id="admin-requests" className="student-section flex flex-col gap-4" aria-label="Resource requests">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Resource Requests</h2>
              <p className="text-muted-foreground text-sm">Track student requests and update statuses with one click.</p>
            </div>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0 hidden lg:flex">
                  <Library size={16} /><span>Filters</span>
                </div>
                <div className="flex-1">
                  <Input
                    value={requestSearchInput}
                    onChange={(event) => setRequestSearchInput(event.target.value)}
                    placeholder="Search requests by student, title, or course..."
                    aria-label="Search requests"
                    className="w-full"
                  />
                </div>
                <div className="flex-1 w-full md:w-auto">
                  <select className="ui-input w-full md:w-auto" value={requestStatusFilter} onChange={(event) => setRequestStatusFilter(event.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="underreview">Under Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
                    {filteredRequests.length} requests
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
            
            {filteredRequests.length === 0 ? (
              <Card className="p-10 flex flex-col items-center text-center text-muted-foreground">
                <Inbox size={40} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No requests found</h3>
                <p>Try a different search term or status filter.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredRequests.map((entry) => (
                  <Card key={entry.id} className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base line-clamp-1 mb-1" title={entry.titleName || 'Untitled request'}>{entry.titleName || 'Untitled request'}</h3>
                        <p className="text-sm text-foreground my-1">{entry.studentName || entry.studentEmail}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant="secondary" className="font-normal">{entry.courseName || 'No course'}</Badge>
                          <Badge variant="outline" className="font-normal">{entry.preferredFormat || 'Any format'}</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={entry.status === 'done' ? 'default' : entry.status === 'underreview' ? 'secondary' : 'outline'} className="mb-2">
                          {requestStatusLabel(entry.status)}
                        </Badge>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDisplayDate(entry.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex bg-muted/50 p-2 rounded-md gap-2 flex-wrap items-center mt-auto">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mx-2">Set Status:</span>
                      <Button size="sm" variant={entry.status === 'pending' ? 'secondary' : 'ghost'} onClick={() => handleRequestStatusChange(entry, 'pending')} disabled={entry.status === 'pending'}><RefreshCcw size={14} className="mr-1"/>Pending</Button>
                      <Button size="sm" variant={entry.status === 'underreview' ? 'secondary' : 'ghost'} onClick={() => handleRequestStatusChange(entry, 'underreview')} disabled={entry.status === 'underreview'}><Shield size={14} className="mr-1"/>Review</Button>
                      <Button size="sm" variant={entry.status === 'done' ? 'secondary' : 'ghost'} onClick={() => handleRequestStatusChange(entry, 'done')} disabled={entry.status === 'done'}><CheckCircle2 size={14} className="mr-1"/>Done</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section id="admin-activity" className="student-section flex flex-col gap-4" aria-label="Activity log">
            <div className="student-section__heading">
              <h2 className="text-xl font-semibold">Activity</h2>
              <p className="text-muted-foreground text-sm">Recent access-control and moderation events.</p>
            </div>
            <Card className="max-h-[60vh] flex flex-col">
              <CardContent className="student-download-list flex-1 overflow-y-auto p-5 custom-scrollbar">
                {activity.length > 0 ? (
                  activity.map((entry) => (
                    <div key={entry.id} className="student-download-item flex justify-between items-center py-3 border-b border-border last:border-0">
                      <div>
                        <strong className="block text-sm font-medium">{entry.message || entry.action}</strong>
                        <p className="text-xs text-muted-foreground mt-1">{formatDisplayDate(entry.createdAt, 'Activity recorded')}</p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{entry.action}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                    <p>Audit events will appear after protected actions are performed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
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
            <X size={14} />
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
            <X size={14} />
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
            <RefreshCcw size={14} />
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
                <X size={14} />
                Keep Account
              </Button>
              <Button type="button" onClick={confirmHardDelete} disabled={isDeleting || confirmText !== 'DELETE'}>
                <Trash2 size={14} />
                {isDeleting ? 'Removing...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        ) : null}
      </AlertDialog>
    </div>
  )
}
