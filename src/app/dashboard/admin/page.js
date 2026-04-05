'use client'

import {
  AlertCircle,
  Bell,
  Download,
  FileText,
  KeyRound,
  LayoutPanelTop,
  LogOut,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  ADMIN_PROFILE,
  formatDisplayDate,
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
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [submittingCreate, setSubmittingCreate] = useState(false)
  const [resetModal, setResetModal] = useState(null) // { user: object, password: String, submitting: boolean }
  const [pendingCredentials, setPendingCredentials] = useState(null)
  const deferredSearch = useDeferredValue(searchTerm)

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

  useEffect(() => {
    if (!user?.uid) {
      return
    }

    loadOverview()
    loadRequests()
  }, [user?.uid])

  const filteredUsers = users.filter((entry) => {
    const term = deferredSearch.trim().toLowerCase()
    if (!term) {
      return true
    }

    return [
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
  })

  const activeStudents = users.filter(
    (entry) => entry.role === 'student' && entry.status === 'active'
  ).length
  const facultyCount = users.filter((entry) => entry.role === 'faculty').length
  const disabledUsers = users.filter((entry) => entry.status !== 'active').length
  const openRequests = requests.filter((entry) => entry.status !== 'done').length

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
            <a href="#admin-requests" className="dashboard-nav__link">
              <LayoutPanelTop size={18} />
              Resource Requests
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
            <div className="dashboard-topbar__search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search users, login IDs, or roles..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="dashboard-topbar__actions">
              <button type="button" className="dashboard-topbar__icon" aria-label="Notifications">
                <Bell size={18} />
                {openRequests > 0 ? <span className="dashboard-topbar__badge">{openRequests}</span> : null}
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
                        <div className="empty-state">No accounts matched the current search.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-shell__footer">
                <span>{filteredUsers.length} account(s) matched your search.</span>
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
                  {resources.slice(0, 6).map((entry) => (
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
            </div>
          </section>

          <section className="dashboard-section" id="admin-requests">
            <div className="section-header">
              <div>
                <h3>Resource Requests</h3>
                <p>Track student requests, assign status, and follow up when a resource needs a human review.</p>
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
                  {requests.length > 0 ? (
                    requests.map((entry) => (
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
                        <div className="empty-state">No resource requests have been submitted yet.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="table-shell__footer">
                <span>{requests.length} request(s) in the queue.</span>
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
