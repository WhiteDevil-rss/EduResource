'use client'

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  KeyRound,
  HelpCircle,
  LayoutPanelTop,
  LogOut,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  ADMIN_PROFILE,
  formatDisplayDate,
  formatRelativeUpdate,
  getDisplayName,
  getInitials,
  getSafeAvatarUrl,
} from '@/lib/demo-content'

const EMPTY_CREATE_FORM = {
  role: 'faculty',
  displayName: '',
  email: '',
}

function roleChipClassName(role) {
  if (role === 'faculty') return 'role-chip role-chip--faculty'
  if (role === 'admin') return 'role-chip role-chip--admin'
  return 'role-chip role-chip--student'
}

function statusClassName(status) {
  if (status === 'active') return 'status-state status-state--active'
  return 'status-state status-state--banned'
}

function requestStatusClassName(status) {
  if (status === 'done') return 'status-state status-state--active'
  if (status === 'underreview') return 'status-state status-state--draft'
  return 'status-state status-state--pending'
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
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('all')
  const [resourceSearchTerm, setResourceSearchTerm] = useState('')
  const [resourceStatusFilter, setResourceStatusFilter] = useState('all')
  const [requestSearchTerm, setRequestSearchTerm] = useState('')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [resetModal, setResetModal] = useState(null) // { user: object, password: String, submitting: boolean }
  const [pendingCredentials, setPendingCredentials] = useState(null)
  const notificationsPanelRef = useRef(null)
  const deferredUserSearch = useDeferredValue(userSearchTerm)
  const deferredResourceSearch = useDeferredValue(resourceSearchTerm)
  const deferredRequestSearch = useDeferredValue(requestSearchTerm)

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
      setErrorMessage('')
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

  const filteredUsers = users.filter((entry) => {
    const term = deferredUserSearch.trim().toLowerCase()
    if (!term) {
      if (userStatusFilter !== 'all' && entry.status !== userStatusFilter) {
        return false
      }

      return true
    }

    const matchesTerm = [
      entry.displayName,
      entry.email,
      entry.loginId,
      entry.role,
      entry.status,
      entry.authProvider,
    ]
      .join(' ')
      .toLowerCase()
      .includes(term)

    if (!matchesTerm) {
      return false
    }

    if (userStatusFilter !== 'all' && entry.status !== userStatusFilter) {
      return false
    }

    return true
  })

  const filteredResources = resources.filter((entry) => {
    const term = deferredResourceSearch.trim().toLowerCase()
    const matchesTerm = !term || [entry.title, entry.class, entry.subject, entry.summary, entry.status]
      .join(' ')
      .toLowerCase()
      .includes(term)

    if (!matchesTerm) {
      return false
    }

    if (resourceStatusFilter !== 'all' && entry.status !== resourceStatusFilter) {
      return false
    }

    return true
  })

  const filteredRequests = requests.filter((entry) => {
    const term = deferredRequestSearch.trim().toLowerCase()
    const matchesTerm =
      !term ||
      [entry.studentName, entry.studentEmail, entry.courseName, entry.titleName, entry.preferredFormat, entry.status]
        .join(' ')
        .toLowerCase()
        .includes(term)

    if (!matchesTerm) {
      return false
    }

    if (requestStatusFilter !== 'all' && entry.status !== requestStatusFilter) {
      return false
    }

    return true
  })

  const activeStudents = users.filter(
    (entry) => entry.role === 'student' && entry.status === 'active'
  ).length
  const facultyCount = users.filter((entry) => entry.role === 'faculty').length
  const disabledUsers = users.filter((entry) => entry.status !== 'active').length
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
    link.download = 'eduresource-access-control.csv'
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

      setPendingCredentials(payload?.credentials ? {
        ...payload.credentials,
        role: payload?.user?.role || createForm.role,
        email: payload?.user?.email || createForm.email,
      } : null)
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

  const handleStatusChange = async (entry) => {
    const nextStatus = entry.status === 'active' ? 'disabled' : 'active'

    try {
      const response = await fetch(`/api/admin/users/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the user status.')
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === entry.id ? payload.user : item
        )
      )
      toast.success(`${entry.displayName || entry.email} is now ${nextStatus}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the user status.')
    }
  }

  const handleResetCredentials = async (targetUser, forcedPassword = null) => {
    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetCredentials',
          password: forcedPassword || undefined
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
        setResetModal(prev => ({ ...prev, submitting: false }))
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

      setRequests((current) =>
        current.map((entry) => (entry.id === requestEntry.id ? payload.request : entry))
      )
      toast.success(`Request moved to ${requestStatusLabel(status).toLowerCase()}.`)
    } catch (error) {
      toast.error(error.message || 'Could not update the request status.')
    }
  }

  const openNotifications = () => {
    setNotificationsOpen((current) => !current)
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
      toast.success('Notification marked as read.')
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
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar__brand">
            <h1>EduResource</h1>
            <p className="dashboard-sidebar__eyebrow">Admin Hub</p>
          </div>

          <nav className="dashboard-nav">
            <a href="#admin-users" className="dashboard-nav__link dashboard-nav__link--active">
              <Users size={18} />
              User Access
            </a>
            <a href="#admin-resources" className="dashboard-nav__link">
              <FileText size={18} />
              Resource Audit
            </a>
            <a href="#admin-requests" className="dashboard-nav__link dashboard-nav__link--requests">
              <LayoutPanelTop size={18} />
              <span className="dashboard-nav__label">Resource Requests</span>
              {openRequests > 0 ? <span className="dashboard-nav__count">{openRequests}</span> : null}
            </a>
            <a href="#admin-activity" className="dashboard-nav__link">
              <LayoutPanelTop size={18} />
              Activity
            </a>
            <a href="#admin-system" className="dashboard-nav__link">
              <Settings2 size={18} />
              Security
            </a>
          </nav>

          <div className="dashboard-sidebar__footer">
            <button type="button" className="button-secondary" onClick={openNotifications}>
              <Bell size={16} />
              Notifications
              {unreadNotificationCount > 0 ? <span className="dashboard-nav__count">{unreadNotificationCount}</span> : null}
            </button>
            <button type="button" className="button-primary" onClick={() => setCreateOpen(true)}>
              <Sparkles size={16} />
              Create Account
            </button>

            <div className="dashboard-profile">
              <div className="dashboard-profile__avatar">
                <img src={getSafeAvatarUrl(user?.avatar, ADMIN_PROFILE.avatar)} alt="Admin profile" />
              </div>
              <div>
                <strong>{user?.name || getDisplayName(user?.email, ADMIN_PROFILE.name)}</strong>
                <p className="dashboard-sidebar__eyebrow" style={{ marginTop: '0.15rem' }}>
                  {ADMIN_PROFILE.subtitle}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="dashboard-content">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__actions">
              <button
                type="button"
                className="dashboard-topbar__icon"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                onClick={openNotifications}
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 ? <span className="dashboard-topbar__badge">{unreadNotificationCount}</span> : null}
              </button>
              <button
                type="button"
                className="dashboard-topbar__icon"
                aria-label="Refresh data"
                onClick={() => {
                  loadOverview({ background: true })
                  loadRequests({ background: true })
                }}
              >
                <RefreshCw size={18} />
              </button>
              <button type="button" className="dashboard-topbar__icon" aria-label="Log out" onClick={logout}>
                <LogOut size={18} />
              </button>

              <div className="dashboard-topbar__user">
                <div className="dashboard-topbar__user-meta">
                  <strong>{user?.name || getDisplayName(user?.email, ADMIN_PROFILE.name)}</strong>
                  <span>{ADMIN_PROFILE.subtitle}</span>
                </div>
                <div className="dashboard-profile__avatar">
                  <img src={getSafeAvatarUrl(user?.avatar, ADMIN_PROFILE.avatar)} alt="Admin profile" />
                </div>
              </div>

              {notificationsOpen ? (
                <div className="notification-popover" ref={notificationsPanelRef} role="dialog" aria-label="Notifications">
                  <div className="notification-popover__header">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unreadNotificationCount} unread</span>
                    </div>
                    <button
                      type="button"
                      className="dashboard-topbar__icon"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <Circle size={16} />
                    </button>
                  </div>

                  <div className="notification-shell notification-shell--popover">
                    {notificationsError ? (
                      <div className="auth-alert">
                        <HelpCircle size={18} color="var(--tertiary)" />
                        <span>{notificationsError}</span>
                      </div>
                    ) : null}

                    {notificationsLoading ? (
                      <div className="empty-state">Loading notifications...</div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <article
                          key={notification.id}
                          className={`notification-card${notification.readAt ? ' notification-card--read' : ' notification-card--unread'}`}
                        >
                          <button
                            type="button"
                            className="notification-card__mark"
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            {notification.readAt ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <div className="notification-card__copy" onClick={() => markNotificationRead(notification.id)}>
                            <strong>{notification.resourceTitle || notification.message || 'New notification'}</strong>
                            <p>{notification.message || 'A new dashboard update is available.'}</p>
                            <span>
                              {notification.facultyName || notification.studentName || notification.facultyEmail || notification.studentEmail || 'System'} · {formatRelativeUpdate(notification.createdAt)}
                            </span>
                          </div>
                          {!notification.readAt ? <span className="notification-card__dot" /> : null}
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">You do not have any notifications yet.</div>
                    )}
                  </div>

                  <div className="notification-popover__footer">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={readAllNotifications}
                      disabled={notificationsSaving || unreadNotificationCount === 0}
                    >
                      <CheckCircle2 size={16} />
                      {notificationsSaving ? 'Updating...' : 'Read all at once'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <span className="auth-kicker">Security Governance</span>
                <h2>Role-Based Access Control</h2>
                <p>
                  Provision Google-only student access, issue faculty and admin
                  credentials, and monitor account activity from one protected hub.
                </p>
              </div>
            </div>

            {errorMessage ? (
              <div className="auth-alert" style={{ marginBottom: '1rem' }}>
                <AlertCircle size={18} color="var(--tertiary)" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <div className="metric-grid">
              <article className="metric-card">
                <div className="metric-card__top">
                  <div className="metric-card__icon" style={{ background: 'rgba(182, 160, 255, 0.16)', color: 'var(--primary)' }}>
                    <Users size={22} />
                  </div>
                  <span className="metric-card__trend">Live</span>
                </div>
                <span className="metric-card__label">Total Accounts</span>
                <strong className="metric-card__value">{users.length}</strong>
              </article>

              <article className="metric-card">
                <div className="metric-card__top">
                  <div className="metric-card__icon" style={{ background: 'rgba(0, 175, 254, 0.14)', color: 'var(--secondary)' }}>
                    <Shield size={22} />
                  </div>
                  <span className="metric-card__trend">Protected</span>
                </div>
                <span className="metric-card__label">Active Students</span>
                <strong className="metric-card__value">{activeStudents}</strong>
              </article>

              <article className="status-panel">
                <span className="metric-card__label" style={{ color: 'var(--secondary)' }}>Total Resources Uploaded</span>
                <strong className="metric-card__value" style={{ fontSize: '2rem' }}>{resources.length}</strong>
                <div className="status-panel__state">
                  <span className="status-panel__dot" />
                  {refreshing ? 'Refreshing' : 'Live Count'}
                </div>
              </article>
            </div>
          </section>

          {pendingCredentials ? (
            <section className="dashboard-section">
              <div className="support-grid">
                <article className="support-card">
                  <span className="metric-card__label">One-Time Credentials</span>
                  <strong className="metric-card__value" style={{ fontSize: '2rem' }}>
                    {pendingCredentials.loginId || 'Google Only'}
                  </strong>
                  <p>Share these credentials securely now. The temporary password is shown only once from this admin session.</p>
                  <div className="downloads-list">
                    <div className="profile-list__item">
                      <span>Role</span>
                      <strong>{pendingCredentials.role}</strong>
                    </div>
                    <div className="profile-list__item">
                      <span>Email</span>
                      <strong>{pendingCredentials.email}</strong>
                    </div>
                    {pendingCredentials.loginId ? (
                      <div className="profile-list__item">
                        <span>Login ID</span>
                        <strong>{pendingCredentials.loginId}</strong>
                      </div>
                    ) : null}
                    {pendingCredentials.temporaryPassword ? (
                      <div className="profile-list__item">
                        <span>Temporary Password</span>
                        <strong>{pendingCredentials.temporaryPassword}</strong>
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          <section className="dashboard-section" id="admin-users">
            <div className="filter-row" style={{ marginBottom: '1rem' }}>
              <div>
                <h3>User Moderation</h3>
                <p>Enable or disable account access, review role assignment, and reset credentials for managed staff accounts.</p>
              </div>
              <div className="filter-row__actions">
                <div className="filter-input" style={{ width: 'min(100%, 18rem)' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchTerm}
                    onChange={(event) => setUserSearchTerm(event.target.value)}
                  />
                </div>
                {[
                  ['all', 'All'],
                  ['active', 'Active'],
                  ['disabled', 'Disabled'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={userStatusFilter === value ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setUserStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
                <button type="button" className="button-secondary" onClick={() => setCreateOpen(true)}>
                  <Sparkles size={16} />
                  Create Account
                </button>
                <button type="button" className="button-secondary" onClick={exportUsers}>
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="table-shell">
              <table className="data-table data-table--responsive">
                <thead>
                  <tr>
                    <th>User Entity</th>
                    <th>Identity</th>
                    <th>Role</th>
                    <th>Auth</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label="User Entity">
                          <div className="table-entity">
                            <div className="table-avatar table-avatar--initials">
                              {getInitials(entry.displayName || entry.email || 'ER')}
                            </div>
                            <div className="table-entity__copy">
                              <strong>{entry.displayName || getDisplayName(entry.email, 'User')}</strong>
                              <span>{entry.pending ? 'Awaiting Google onboarding' : 'Managed account'}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Identity">
                          <div className="table-entity__copy">
                            <strong>{entry.email}</strong>
                            <span>{entry.loginId ? `Login ID: ${entry.loginId}` : 'Google-only student identity'}</span>
                          </div>
                        </td>
                        <td data-label="Role">
                          <span className={roleChipClassName(entry.role)}>{entry.role}</span>
                        </td>
                        <td data-label="Auth">{authProviderLabel(entry)}</td>
                        <td data-label="Status">
                          <span className={statusClassName(entry.status)}>
                            <span className="status-state__dot" />
                            {entry.status}
                          </span>
                        </td>
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <div className="table-action-group">
                            <button
                              type="button"
                              className={entry.status === 'active' ? 'text-action text-action--danger' : 'text-action text-action--primary'}
                              onClick={() => handleStatusChange(entry)}
                            >
                              {entry.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              className="text-action text-action--primary"
                              onClick={() => setResetModal({ user: entry, password: '', submitting: false })}
                            >
                              Reset Password
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td data-label="User Entity" colSpan={6}>
                        <div className="empty-state">No accounts matched the current search or filter.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-shell__footer">
                <span>{filteredUsers.length} account(s) matched your search and filter.</span>
                <span>{disabledUsers} account(s) currently disabled.</span>
              </div>
            </div>
          </section>

          <section className="dashboard-section" id="admin-resources">
            <div className="section-header">
              <div>
                <h3>Resource Oversight</h3>
                <p>Review recently published academic materials and verify the owner attached to each faculty upload.</p>
              </div>
            </div>

            <div className="filter-row" style={{ marginBottom: '1rem' }}>
              <div>
                <h4 className="filter-row__title">Search and Filter</h4>
                <p>Review live or draft publications by title, class, or subject.</p>
              </div>
              <div className="filter-row__actions">
                <div className="filter-input" style={{ width: 'min(100%, 18rem)' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={resourceSearchTerm}
                    onChange={(event) => setResourceSearchTerm(event.target.value)}
                  />
                </div>
                {[
                  ['all', 'All'],
                  ['live', 'Live'],
                  ['draft', 'Draft'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={resourceStatusFilter === value ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setResourceStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-shell">
              <table className="data-table data-table--responsive">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.slice(0, 6).map((entry) => (
                    <tr key={entry.id}>
                      <td data-label="Title">{entry.title}</td>
                      <td data-label="Class">{entry.class}</td>
                      <td data-label="Subject">
                        <span className="subject-chip subject-chip--faculty">{entry.subject}</span>
                      </td>
                      <td data-label="Status">
                        <span className={entry.status === 'live' ? 'status-state status-state--active' : 'status-state status-state--draft'}>
                          <span className="status-state__dot" />
                          {entry.status}
                        </span>
                      </td>
                      <td data-label="Published">{formatDisplayDate(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResources.length === 0 ? (
                <div className="empty-state" style={{ margin: '1rem 1.5rem' }}>No resources matched the current search or filter.</div>
              ) : null}
            </div>
          </section>

          <section className="dashboard-section" id="admin-requests">
            <div className="section-header">
              <div>
                <h3>Resource Requests</h3>
                <p>Track student requests, assign status, and follow up when a resource needs a human review.</p>
              </div>
            </div>

            <div className="filter-row" style={{ marginBottom: '1rem' }}>
              <div>
                <h4 className="filter-row__title">Search and Filter</h4>
                <p>Review requests by student, course, title, or current status.</p>
              </div>
              <div className="filter-row__actions">
                <div className="filter-input" style={{ width: 'min(100%, 18rem)' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={requestSearchTerm}
                    onChange={(event) => setRequestSearchTerm(event.target.value)}
                  />
                </div>
                {[
                  ['all', 'All'],
                  ['pending', 'Pending'],
                  ['underreview', 'Under Review'],
                  ['done', 'Done'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={requestStatusFilter === value ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setRequestStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-shell">
              <table className="data-table data-table--responsive">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Requested Item</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((entry) => (
                      <tr key={entry.id}>
                        <td data-label="Student">
                          <div className="table-entity__copy">
                            <strong>{entry.studentName || entry.studentEmail}</strong>
                            <span>{entry.studentEmail}</span>
                          </div>
                        </td>
                        <td data-label="Course">{entry.courseName || 'Not specified'}</td>
                        <td data-label="Requested Item">
                          <div className="table-entity__copy">
                            <strong>{entry.titleName || 'Untitled request'}</strong>
                            <span>{entry.preferredFormat || 'No preferred format'}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className={requestStatusClassName(entry.status)}>
                            <span className="status-state__dot" />
                            {requestStatusLabel(entry.status)}
                          </span>
                        </td>
                        <td data-label="Submitted">{formatDisplayDate(entry.createdAt)}</td>
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <div className="table-action-group">
                            <button
                              type="button"
                              className="text-action text-action--primary"
                              onClick={() => handleRequestStatusChange(entry, 'pending')}
                              disabled={entry.status === 'pending'}
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              className="text-action text-action--primary"
                              onClick={() => handleRequestStatusChange(entry, 'underreview')}
                              disabled={entry.status === 'underreview'}
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              className="text-action text-action--primary"
                              onClick={() => handleRequestStatusChange(entry, 'done')}
                              disabled={entry.status === 'done'}
                            >
                              Done
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td data-label="Student" colSpan={6}>
                        <div className="empty-state">No resource requests matched the current search or filter.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-shell__footer">
                <span>{filteredRequests.length} request(s) in the queue.</span>
                <span>Statuses available: pending, under review, done.</span>
              </div>
            </div>
          </section>

          <section className="dashboard-section" id="admin-activity">
            <div className="section-header">
              <div>
                <h3>Security Activity</h3>
                <p>Recent account and access events recorded by the protected server APIs.</p>
              </div>
            </div>

            <div className="support-grid">
              <article className="support-card">
                <span className="metric-card__label">Recent Activity</span>
                <div className="downloads-list">
                  {activity.length > 0 ? (
                    activity.map((entry) => (
                      <div key={entry.id} className="downloads-item">
                        <div className="downloads-item__copy">
                          <strong>{entry.message || entry.action}</strong>
                          <span>{formatDisplayDate(entry.createdAt, 'Activity recorded')}</span>
                        </div>
                        <span className="subject-chip subject-chip--neutral">
                          {entry.action}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Audit events will appear here after protected actions are performed.</div>
                  )}
                </div>
              </article>

              <article className="support-card" id="admin-system">
                <span className="metric-card__label">Security Summary</span>
                <div className="downloads-list">
                  <div className="profile-list__item">
                    <span>Faculty Accounts</span>
                    <strong>{facultyCount}</strong>
                  </div>
                  <div className="profile-list__item">
                    <span>Disabled Accounts</span>
                    <strong>{disabledUsers}</strong>
                  </div>
                  <div className="profile-list__item">
                    <span>Protected Resources</span>
                    <strong>{resources.length}</strong>
                  </div>
                </div>
                <p style={{ marginTop: '1rem' }}>
                  Each dashboard now reads and writes through signed-session APIs.
                  Students authenticate with Google only, while faculty and admin
                  accounts are issued by this panel.
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>

      {createOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Create Account</h3>
            <p>Provision Google-only student access or generate staff credentials directly from the admin workspace.</p>

            <form className="modal-form" onSubmit={handleCreateUser}>
              <div className="auth-field auth-select">
                <label htmlFor="admin-role">Role</label>
                <div className="auth-select">
                  <select
                    id="admin-role"
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
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="admin-display-name">Display Name</label>
                <input
                  id="admin-display-name"
                  className="auth-textarea"
                  type="text"
                  value={createForm.displayName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Dr. Elena Kostic"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  className="auth-textarea"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="user@institution.edu"
                  required
                />
              </div>

              <div className="auth-alert">
                <KeyRound size={18} color="var(--secondary)" />
                <span>
                  Faculty and admin accounts receive a generated login ID and temporary password.
                  Student accounts are prepared for Google OAuth only.
                </span>
              </div>

              <div className="modal-form__actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={submittingCreate}>
                  {submittingCreate ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetModal ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Reset User Password</h3>
            <p>
              Set a new password for <strong>{resetModal.user.displayName || resetModal.user.email}</strong>.
              Leave the field blank for an auto-generated secure password.
            </p>

            <form 
              className="modal-form" 
              onSubmit={(e) => {
                e.preventDefault()
                setResetModal(prev => ({ ...prev, submitting: true }))
                handleResetCredentials(resetModal.user, resetModal.password.trim() || null)
              }}
            >
              <div className="auth-field">
                <label htmlFor="reset-new-password">Manual Password (Optional)</label>
                <input
                  id="reset-new-password"
                  className="auth-textarea"
                  type="text"
                  autoComplete="off"
                  value={resetModal.password}
                  onChange={(e) => setResetModal(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div className="auth-alert">
                <Shield size={18} color="var(--primary)" />
                <span>
                  Resetting the password will create or update the underlying identity record and display the new credentials immediately.
                </span>
              </div>

              <div className="modal-form__actions">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={resetModal.submitting}
                  onClick={() => setResetModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={resetModal.submitting}>
                  {resetModal.submitting ? 'Processing...' : 'Reset Password Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
